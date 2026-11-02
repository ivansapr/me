import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import {
  chutePosition,
  clampClaw,
  isOverChute,
  type Vec2
} from './wishlistClaw';
import { prizeSrc, prizes, type Prize } from './wishlistPrizes';

export type DropResult =
  | { kind: 'busy' }
  | { kind: 'miss' }
  | { kind: 'slip' }
  | { kind: 'prize'; prize: Prize };

export type ClawScene = {
  setDirection(direction: Vec2): void;
  nudge(direction: Vec2): void;
  drop(): Promise<DropResult>;
  reset(): void;
  readonly remaining: number;
  dispose(): void;
};

type Options = { onFreePrize?: (prize: Prize) => void };
type Phase =
  | 'idle'
  | 'lowering'
  | 'closing'
  | 'raising'
  | 'carrying'
  | 'releasing'
  | 'falling'
  | 'revealing';
type Ball = {
  prize: Prize;
  color: string;
  body: CANNON.Body;
  group: THREE.Group;
};

const INK = '#3b1d0f';
const BALL_COLORS = ['#ff6b4a', '#ffc247', '#4fb6a8', '#7b6cf6'];
const RADIUS = 0.5;
const BALL_COUNT = 14;
const CLAW_MIN_Y = 1.35;
const CLAW_MAX_Y = 5.2;
const GRIP_OPEN = 0.95;
const GRIP_CLOSED = 0.3;
const PIT_Y = -1;

const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeBack = (t: number) => 1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

export function createClawScene(
  canvas: HTMLCanvasElement,
  options: Options = {}
): ClawScene {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-5.6, 5.6, 5.6, -5.6, 0.1, 60);
  camera.position.set(11, 9.5, 11);
  camera.lookAt(0, 1.7, 0);

  scene.add(new THREE.HemisphereLight('#fff3e2', '#c98a5a', 1.5));
  const sun = new THREE.DirectionalLight('#ffffff', 2.2);
  sun.position.set(6, 12, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, {
    left: -6,
    right: 6,
    top: 6,
    bottom: -6,
    near: 1,
    far: 40
  });
  scene.add(sun);

  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -28, 0) });
  world.allowSleep = true;
  (world.solver as CANNON.GSSolver).iterations = 12;
  const ballMaterial = new CANNON.Material('ball');
  const staticMaterial = new CANNON.Material('static');
  world.addContactMaterial(
    new CANNON.ContactMaterial(ballMaterial, ballMaterial, {
      friction: 0.25,
      restitution: 0.35
    })
  );
  world.addContactMaterial(
    new CANNON.ContactMaterial(ballMaterial, staticMaterial, {
      friction: 0.35,
      restitution: 0.3
    })
  );

  function addStaticBox(
    half: [number, number, number],
    at: [number, number, number]
  ) {
    const body = new CANNON.Body({
      mass: 0,
      material: staticMaterial,
      shape: new CANNON.Box(new CANNON.Vec3(...half))
    });
    body.position.set(...at);
    world.addBody(body);
  }

  // The floor has a corner hole (the chute) over a pit.
  addStaticBox([3, 0.5, 2.25], [0, -0.5, -0.75]);
  addStaticBox([2.25, 0.5, 0.75], [0.75, -0.5, 2.25]);
  addStaticBox([3, 0.5, 3], [0, -3, 0]);
  addStaticBox([3.5, 5, 0.5], [0, 1, -3.5]);
  addStaticBox([3.5, 5, 0.5], [0, 1, 3.5]);
  addStaticBox([0.5, 5, 3.5], [-3.5, 1, 0]);
  addStaticBox([0.5, 5, 3.5], [3.5, 1, 0]);

  const disposables: { dispose(): void }[] = [];
  const track = <T extends { dispose(): void }>(item: T) => {
    disposables.push(item);
    return item;
  };

  function addMesh(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    at: [number, number, number],
    parent: THREE.Object3D = scene
  ) {
    const mesh = new THREE.Mesh(track(geometry), track(material));
    mesh.position.set(...at);
    parent.add(mesh);
    return mesh;
  }

  const lineMaterial = track(new THREE.LineBasicMaterial({ color: INK }));
  function addOutline(
    geometry: THREE.BufferGeometry,
    at: [number, number, number]
  ) {
    const edges = track(new THREE.EdgesGeometry(geometry));
    const lines = new THREE.LineSegments(edges, lineMaterial);
    lines.position.set(...at);
    scene.add(lines);
    track(geometry);
  }

  const floorMaterial = track(
    new THREE.MeshStandardMaterial({ color: '#e59a62' })
  );
  for (const [size, at] of [
    [
      [6, 2.5, 4.5],
      [0, -1.25, -0.75]
    ],
    [
      [4.5, 2.5, 1.5],
      [0.75, -1.25, 2.25]
    ]
  ] as const) {
    const floor = new THREE.Mesh(
      track(new THREE.BoxGeometry(...size)),
      floorMaterial
    );
    floor.position.set(at[0], at[1], at[2]);
    floor.receiveShadow = true;
    scene.add(floor);
    addOutline(new THREE.BoxGeometry(...size), [...at]);
  }
  addMesh(
    new THREE.BoxGeometry(1.5, 2.5, 1.5),
    new THREE.MeshStandardMaterial({ color: '#7a3a1c', side: THREE.BackSide }),
    [-2.25, -1.25, 2.25]
  );

  const back = addMesh(
    new THREE.PlaneGeometry(6, 6),
    new THREE.MeshStandardMaterial({ color: '#ffe3c4' }),
    [0, 3, -3]
  );
  back.receiveShadow = true;
  const left = addMesh(
    new THREE.PlaneGeometry(6, 6),
    new THREE.MeshStandardMaterial({ color: '#f7c99c' }),
    [-3, 3, 0]
  );
  left.rotation.y = Math.PI / 2;
  left.receiveShadow = true;

  const glassMaterial = track(
    new THREE.MeshPhysicalMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0.13,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  );
  const front = new THREE.Mesh(
    track(new THREE.PlaneGeometry(6, 6)),
    glassMaterial
  );
  front.position.set(0, 3, 3);
  const right = front.clone();
  right.position.set(3, 3, 0);
  right.rotation.y = Math.PI / 2;
  scene.add(front, right);
  addOutline(new THREE.BoxGeometry(6, 6, 6), [0, 3, 0]);

  // Chute marker on the floor corner.
  addMesh(
    new THREE.BoxGeometry(1.5, 0.04, 1.5),
    new THREE.MeshBasicMaterial({ color: '#8a3a1c' }),
    [-2.25, 0.02, 2.25]
  ).visible = false;

  // Claw rig.
  const trolley = addMesh(
    new THREE.BoxGeometry(0.9, 0.3, 0.9),
    new THREE.MeshStandardMaterial({ color: INK }),
    [0, 6, 0]
  );
  const cable = addMesh(
    new THREE.CylinderGeometry(0.05, 0.05, 1, 8),
    new THREE.MeshStandardMaterial({ color: INK }),
    [0, 4, 0]
  );
  const clawGroup = new THREE.Group();
  scene.add(clawGroup);
  addMesh(
    new THREE.CylinderGeometry(0.32, 0.38, 0.3, 20),
    new THREE.MeshStandardMaterial({ color: '#ffc247' }),
    [0, 0, 0],
    clawGroup
  ).castShadow = true;
  const prongGeometry = track(new THREE.BoxGeometry(0.1, 0.9, 0.1));
  const prongMaterial = track(new THREE.MeshStandardMaterial({ color: INK }));
  const pivots: THREE.Group[] = [];
  for (let i = 0; i < 3; i += 1) {
    const angle = (i / 3) * Math.PI * 2;
    const pivot = new THREE.Group();
    pivot.position.set(Math.cos(angle) * 0.3, -0.1, Math.sin(angle) * 0.3);
    pivot.rotation.y = -angle;
    const prong = new THREE.Mesh(prongGeometry, prongMaterial);
    prong.position.y = -0.45;
    prong.castShadow = true;
    pivot.add(prong);
    clawGroup.add(pivot);
    pivots.push(pivot);
  }

  const headBody = new CANNON.Body({
    mass: 0,
    type: CANNON.Body.KINEMATIC,
    material: staticMaterial,
    shape: new CANNON.Sphere(0.4)
  });
  world.addBody(headBody);

  // Balls.
  const ballGeometries = {
    top: track(
      new THREE.SphereGeometry(RADIUS, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2)
    ),
    bottom: track(
      new THREE.SphereGeometry(
        RADIUS,
        28,
        14,
        0,
        Math.PI * 2,
        Math.PI / 2,
        Math.PI / 2
      )
    )
  };
  const bottomMaterial = track(
    new THREE.MeshStandardMaterial({
      color: '#fff4e0',
      roughness: 0.35,
      side: THREE.DoubleSide
    })
  );
  const topMaterials = BALL_COLORS.map((color) =>
    track(
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.3,
        side: THREE.DoubleSide
      })
    )
  );

  function buildBallGroup(colorIndex: number) {
    const group = new THREE.Group();
    const top = new THREE.Mesh(ballGeometries.top, topMaterials[colorIndex]);
    const bottom = new THREE.Mesh(ballGeometries.bottom, bottomMaterial);
    top.castShadow = bottom.castShadow = true;
    top.name = 'top';
    group.add(top, bottom);
    return group;
  }

  let balls: Ball[] = [];

  function createBall(index: number): Ball {
    const colorIndex = index % BALL_COLORS.length;
    const body = new CANNON.Body({
      mass: 1,
      material: ballMaterial,
      shape: new CANNON.Sphere(RADIUS),
      linearDamping: 0.12,
      angularDamping: 0.35,
      allowSleep: true
    });
    const layer = Math.floor(index / 4);
    for (;;) {
      const x = (Math.random() * 2 - 1) * 2.3;
      const z = (Math.random() * 2 - 1) * 2.3;
      if (x < -0.4 && z > 0.4) continue;
      body.position.set(x, 0.6 + layer * 1.1 + Math.random() * 0.2, z);
      break;
    }
    world.addBody(body);
    const group = buildBallGroup(colorIndex);
    group.rotation.set(Math.random() * 3, Math.random() * 3, 0);
    body.quaternion.set(
      group.quaternion.x,
      group.quaternion.y,
      group.quaternion.z,
      group.quaternion.w
    );
    scene.add(group);
    return {
      prize: prizes[index % prizes.length],
      color: BALL_COLORS[colorIndex],
      body,
      group
    };
  }

  function removeBall(ball: Ball) {
    world.removeBody(ball.body);
    scene.remove(ball.group);
    balls = balls.filter((item) => item !== ball);
  }

  function syncBall(ball: Ball) {
    ball.group.position.set(
      ball.body.position.x,
      ball.body.position.y,
      ball.body.position.z
    );
    ball.group.quaternion.set(
      ball.body.quaternion.x,
      ball.body.quaternion.y,
      ball.body.quaternion.z,
      ball.body.quaternion.w
    );
  }

  function fillMachine() {
    for (const ball of [...balls]) removeBall(ball);
    balls = Array.from({ length: BALL_COUNT }, (_, i) => createBall(i));
    for (let step = 0; step < 420; step += 1) world.step(1 / 60);
    for (const ball of balls.filter((item) => item.body.position.y < PIT_Y)) {
      removeBall(ball);
    }
    balls.forEach(syncBall);
  }

  // Prize textures.
  const textures = new Map<Prize, THREE.CanvasTexture>();
  function prizeTexture(prize: Prize) {
    let texture = textures.get(prize);
    if (texture) return texture;
    const surface = document.createElement('canvas');
    surface.width = surface.height = 128;
    texture = track(new THREE.CanvasTexture(surface));
    texture.colorSpace = THREE.SRGBColorSpace;
    const image = new Image();
    image.onload = () => {
      surface.getContext('2d')?.drawImage(image, 0, 0, 128, 128);
      texture!.needsUpdate = true;
    };
    image.src = prizeSrc(prize);
    textures.set(prize, texture);
    return texture;
  }

  // State machine.
  let phase: Phase = 'idle';
  let phaseTime = 0;
  const pos = { x: 0, z: 0 };
  const target = { x: 0, z: 0 };
  let direction: Vec2 = { x: 0, z: 0 };
  let clawY = CLAW_MAX_Y;
  let grip = 0;
  let gripTarget = 0;
  let held: Ball | null = null;
  let slipHeight: number | null = null;
  let outcome: 'miss' | 'slip' | 'grab' = 'miss';
  let resolveDrop: ((result: DropResult) => void) | null = null;
  let dropping: Ball | null = null;
  let revealRoot: THREE.Group | null = null;
  let revealBall: THREE.Group | null = null;
  let revealSprite: THREE.Sprite | null = null;
  let revealPrize: Prize | null = null;
  let freeReveal = false;

  const setPhase = (next: Phase) => {
    phase = next;
    phaseTime = 0;
  };

  function releaseHeld() {
    if (!held) return;
    held.body.type = CANNON.Body.DYNAMIC;
    held.body.mass = 1;
    held.body.updateMassProperties();
    held.body.velocity.setZero();
    held.body.wakeUp();
    held = null;
  }

  function clearReveal() {
    if (!revealRoot) return;
    scene.remove(revealRoot);
    revealRoot = revealBall = revealSprite = null;
    revealPrize = null;
  }

  function startReveal(ball: Ball) {
    clearReveal();
    revealPrize = ball.prize;
    revealRoot = new THREE.Group();
    revealRoot.position.set(0, 2.4, 0);
    revealBall = buildBallGroup(BALL_COLORS.indexOf(ball.color));
    revealRoot.add(revealBall);
    const material = new THREE.SpriteMaterial({
      map: prizeTexture(ball.prize),
      transparent: true,
      depthTest: false
    });
    track(material);
    revealSprite = new THREE.Sprite(material);
    revealSprite.renderOrder = 10;
    revealSprite.scale.setScalar(0.001);
    revealRoot.add(revealSprite);
    scene.add(revealRoot);
    removeBall(ball);
    setPhase('revealing');
  }

  function updateReveal() {
    if (!revealRoot || !revealBall || !revealSprite) return;
    const grow = easeOut(clamp01(phaseTime / 0.6));
    revealRoot.position.y = 2.4 + grow * 0.9;
    revealBall.scale.setScalar(0.6 + grow * 1.4);
    revealBall.rotation.y = phaseTime * 2;
    const open = easeBack(clamp01((phaseTime - 0.6) / 0.5));
    const top = revealBall.getObjectByName('top');
    if (top) {
      top.position.y = open * 0.35;
      top.rotation.z = open * -1.1;
    }
    const size = open * 2.1;
    revealSprite.scale.setScalar(Math.max(0.001, size));
    revealSprite.position.y = 0.6 + open * 1.3 + Math.sin(phaseTime * 4) * 0.06;
  }

  function finish(result: DropResult) {
    setPhase('idle');
    resolveDrop?.(result);
    resolveDrop = null;
  }

  function moveClaw(dt: number) {
    const next = clampClaw({
      x: target.x + direction.x * 2.6 * dt,
      z: target.z + direction.z * 2.6 * dt
    });
    target.x = next.x;
    target.z = next.z;
    const k = Math.min(1, dt * 9);
    pos.x += (target.x - pos.x) * k;
    pos.z += (target.z - pos.z) * k;
  }

  function grabNearest() {
    const tip = new CANNON.Vec3(pos.x, clawY - 0.55, pos.z);
    let best: Ball | null = null;
    let bestDistance = 0.95;
    for (const ball of balls) {
      const distance = ball.body.position.distanceTo(tip);
      if (distance < bestDistance) {
        best = ball;
        bestDistance = distance;
      }
    }
    return best;
  }

  function updateClaw(dt: number) {
    phaseTime += dt;
    gripTarget =
      phase === 'closing' || phase === 'raising' || phase === 'carrying'
        ? 1
        : 0;
    grip +=
      Math.sign(gripTarget - grip) *
      Math.min(Math.abs(gripTarget - grip), dt * 2.8);

    switch (phase) {
      case 'idle': {
        moveClaw(dt);
        const lost = balls.find((ball) => ball.body.position.y < PIT_Y);
        if (lost) {
          freeReveal = true;
          startReveal(lost);
        }
        break;
      }
      case 'lowering':
        clawY = Math.max(CLAW_MIN_Y, clawY - 4.5 * dt);
        if (clawY === CLAW_MIN_Y) setPhase('closing');
        break;
      case 'closing':
        if (phaseTime >= 0.55) {
          held = grabNearest();
          if (held) {
            held.body.type = CANNON.Body.KINEMATIC;
            held.body.mass = 0;
            held.body.updateMassProperties();
            outcome = 'grab';
            slipHeight = Math.random() < 0.3 ? 2.4 + Math.random() * 1.6 : null;
          } else {
            outcome = 'miss';
          }
          setPhase('raising');
        }
        break;
      case 'raising':
        clawY = Math.min(CLAW_MAX_Y, clawY + 3.6 * dt);
        if (held && slipHeight !== null && clawY > slipHeight) {
          releaseHeld();
          outcome = 'slip';
        }
        if (clawY === CLAW_MAX_Y) {
          if (held) {
            target.x = pos.x;
            target.z = pos.z;
            setPhase('carrying');
          } else {
            finish({ kind: outcome === 'slip' ? 'slip' : 'miss' });
          }
        }
        break;
      case 'carrying': {
        const dx = chutePosition.x - pos.x;
        const dz = chutePosition.z - pos.z;
        const distance = Math.hypot(dx, dz);
        const step = Math.min(distance, 3.2 * dt);
        if (distance > 0) {
          pos.x += (dx / distance) * step;
          pos.z += (dz / distance) * step;
        }
        target.x = pos.x;
        target.z = pos.z;
        if (isOverChute(pos, 0.02)) setPhase('releasing');
        break;
      }
      case 'releasing':
        if (phaseTime >= 0.4) {
          dropping = held;
          releaseHeld();
          setPhase('falling');
        }
        break;
      case 'falling':
        if (dropping && (dropping.body.position.y < PIT_Y || phaseTime > 3)) {
          startReveal(dropping);
          dropping = null;
        }
        break;
      case 'revealing':
        updateReveal();
        if (phaseTime >= 1.9) {
          const prize = revealPrize;
          if (freeReveal && prize) options.onFreePrize?.(prize);
          freeReveal = false;
          if (prize && resolveDrop) finish({ kind: 'prize', prize });
          else setPhase('idle');
        }
        break;
    }

    if (phase === 'revealing') updateReveal();

    if (held) {
      held.body.position.set(pos.x, clawY - 0.55, pos.z);
      held.body.velocity.setZero();
    }

    const previous = headBody.position.clone();
    headBody.position.set(pos.x, clawY - 0.25, pos.z);
    headBody.velocity.set(
      (pos.x - previous.x) / Math.max(dt, 1e-3),
      (clawY - 0.25 - previous.y) / Math.max(dt, 1e-3),
      (pos.z - previous.z) / Math.max(dt, 1e-3)
    );

    clawGroup.position.set(pos.x, clawY, pos.z);
    const angle = GRIP_OPEN + (GRIP_CLOSED - GRIP_OPEN) * grip;
    for (const pivot of pivots) pivot.rotation.z = angle;
    trolley.position.set(pos.x, 6, pos.z);
    cable.position.set(pos.x, (6 + clawY) / 2, pos.z);
    cable.scale.y = 6 - clawY;
  }

  // Loop.
  let frameId = 0;
  let last = 0;
  function frame(now: number) {
    frameId = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    world.step(1 / 60, dt, 3);
    updateClaw(dt);
    balls.forEach(syncBall);
    renderer.render(scene, camera);
  }
  const start = () => {
    if (frameId) return;
    last = performance.now();
    frameId = requestAnimationFrame(frame);
  };
  const stop = () => {
    cancelAnimationFrame(frameId);
    frameId = 0;
  };

  const parent = canvas.parentElement ?? canvas;
  const resize = () => {
    const width = parent.clientWidth || 300;
    const height = parent.clientHeight || width;
    renderer.setSize(width, height, false);
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(parent);
  const visibility = new IntersectionObserver(([entry]) => {
    if (entry?.isIntersecting) start();
    else stop();
  });
  visibility.observe(canvas);
  resize();
  fillMachine();
  updateClaw(0);
  renderer.render(scene, camera);

  return {
    setDirection(next) {
      direction = next;
      if (phase === 'idle' && (next.x || next.z)) clearReveal();
    },
    nudge(next) {
      if (phase !== 'idle') return;
      clearReveal();
      const moved = clampClaw({
        x: target.x + next.x * 0.7,
        z: target.z + next.z * 0.7
      });
      target.x = moved.x;
      target.z = moved.z;
    },
    drop() {
      if (phase !== 'idle' || balls.length === 0) {
        return Promise.resolve<DropResult>({ kind: 'busy' });
      }
      clearReveal();
      direction = { x: 0, z: 0 };
      setPhase('lowering');
      return new Promise<DropResult>((resolve) => {
        resolveDrop = resolve;
      });
    },
    reset() {
      if (phase !== 'idle') return;
      clearReveal();
      fillMachine();
    },
    get remaining() {
      return balls.length;
    },
    dispose() {
      stop();
      resizeObserver.disconnect();
      visibility.disconnect();
      for (const item of disposables) item.dispose();
      renderer.dispose();
    }
  };
}
