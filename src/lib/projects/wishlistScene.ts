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
  { kind: 'busy' } | { kind: 'miss' } | { kind: 'slip' } | { kind: 'prize' };

export type ClawScene = {
  aimAt(clientX: number, clientY: number): void;
  nudge(direction: Vec2): void;
  drop(): Promise<DropResult>;
  reset(): void;
  readonly remaining: number;
  dispose(): void;
};

type WallText = { title: string; lines: string[] };
type Options = {
  onPrize?: (prize: Prize) => void;
  walls?: { back?: WallText; left?: WallText };
};
type Phase =
  'idle' | 'lowering' | 'closing' | 'raising' | 'carrying' | 'releasing';
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
const GRIP_OPEN = 0.5;
const GRIP_CLOSED = -0.03;
const FIXED_STEP = 1 / 60;
const REVEAL_SECONDS = 2.6;
const PIT_Y = -1;
const VIEW_HALF = 5.2;
// The claw aims at the point under the cursor at roughly ball-top height.
const AIM_PLANE_Y = 1;
// Every other drop gets a hidden magnet so the game stays winnable.
// It only reaches balls just under the claw head and pulls harder than gravity.
const ASSIST_FORCE = 1.6 * 28;
const ASSIST_RADIUS = 0.45;
const ASSIST_REACH = 0.35;
const HEAD_HALF_HEIGHT = 0.18;

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
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 60);
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

  // Walls carry the instructions, painted into the upper half above the balls.
  function wallMaterial(color: string, text?: WallText) {
    if (!text) return new THREE.MeshStandardMaterial({ color });
    const surface = document.createElement('canvas');
    surface.width = surface.height = 1024;
    const context = surface.getContext('2d');
    if (!context) return new THREE.MeshStandardMaterial({ color });
    context.fillStyle = color;
    context.fillRect(0, 0, 1024, 1024);
    context.fillStyle = INK;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = '900 112px system-ui, sans-serif';
    context.fillText(text.title.toUpperCase(), 512, 200);
    context.fillRect(382, 282, 260, 12);
    context.font = '800 84px system-ui, sans-serif';
    text.lines.forEach((line, index) => {
      context.fillText(line, 512, 380 + index * 100);
    });
    const texture = track(new THREE.CanvasTexture(surface));
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return new THREE.MeshStandardMaterial({ map: texture });
  }

  const back = addMesh(
    new THREE.PlaneGeometry(6, 6),
    wallMaterial('#ffe3c4', options.walls?.back),
    [0, 3, -3]
  );
  back.receiveShadow = true;
  const left = addMesh(
    new THREE.PlaneGeometry(6, 6),
    wallMaterial('#f7c99c', options.walls?.left),
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

  const PRONG_LENGTH = 1.05;
  const PIVOT_RADIUS = 0.6;
  const PIVOT_Y = -0.15;
  const prongGeometry = track(new THREE.BoxGeometry(0.12, PRONG_LENGTH, 0.12));
  const prongMaterial = track(new THREE.MeshStandardMaterial({ color: INK }));
  const pivots: THREE.Group[] = [];
  const prongMeshes: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i += 1) {
    const angle = (i / 3) * Math.PI * 2;
    const pivot = new THREE.Group();
    pivot.position.set(
      Math.cos(angle) * PIVOT_RADIUS,
      PIVOT_Y,
      Math.sin(angle) * PIVOT_RADIUS
    );
    pivot.rotation.y = -angle;
    const prong = new THREE.Mesh(prongGeometry, prongMaterial);
    prong.position.y = -PRONG_LENGTH / 2;
    prong.castShadow = true;
    pivot.add(prong);
    clawGroup.add(pivot);
    pivots.push(pivot);
    prongMeshes.push(prong);
  }

  // Claw parts are kinematic bodies that follow the visible meshes.
  const clawMaterial = new CANNON.Material('claw');
  world.addContactMaterial(
    new CANNON.ContactMaterial(clawMaterial, ballMaterial, {
      friction: 0.5,
      restitution: 0.05
    })
  );
  function addKinematic(shape: CANNON.Shape) {
    const body = new CANNON.Body({
      mass: 0,
      type: CANNON.Body.KINEMATIC,
      material: clawMaterial,
      allowSleep: false,
      shape
    });
    world.addBody(body);
    return body;
  }
  const headBody = addKinematic(
    new CANNON.Box(new CANNON.Vec3(0.42, 0.18, 0.42))
  );
  const prongBodies = prongMeshes.map(() =>
    addKinematic(new CANNON.Box(new CANNON.Vec3(0.06, PRONG_LENGTH / 2, 0.06)))
  );
  let clawPosed = false;
  const tmpPosition = new THREE.Vector3();
  const tmpQuaternion = new THREE.Quaternion();
  const tmpDelta = new THREE.Quaternion();
  const tmpCurrent = new THREE.Quaternion();

  function driveBody(
    body: CANNON.Body,
    position: THREE.Vector3,
    quaternion: THREE.Quaternion,
    dt: number
  ) {
    if (!clawPosed) {
      body.position.set(position.x, position.y, position.z);
      body.quaternion.set(
        quaternion.x,
        quaternion.y,
        quaternion.z,
        quaternion.w
      );
      return;
    }
    body.velocity.set(
      (position.x - body.position.x) / dt,
      (position.y - body.position.y) / dt,
      (position.z - body.position.z) / dt
    );
    tmpCurrent.set(
      body.quaternion.x,
      body.quaternion.y,
      body.quaternion.z,
      body.quaternion.w
    );
    tmpDelta.copy(quaternion).multiply(tmpCurrent.invert());
    if (tmpDelta.w < 0) {
      tmpDelta.set(-tmpDelta.x, -tmpDelta.y, -tmpDelta.z, -tmpDelta.w);
    }
    const half = Math.acos(Math.min(1, tmpDelta.w));
    const sin = Math.sin(half);
    const rate = sin > 1e-6 ? (2 * half) / (sin * dt) : 0;
    body.angularVelocity.set(
      tmpDelta.x * rate,
      tmpDelta.y * rate,
      tmpDelta.z * rate
    );
  }

  function driveClawBodies(dt: number) {
    clawGroup.updateMatrixWorld(true);
    tmpPosition.set(pos.x, clawY, pos.z);
    tmpQuaternion.identity();
    driveBody(headBody, tmpPosition, tmpQuaternion, dt);
    prongMeshes.forEach((mesh, index) => {
      mesh.getWorldPosition(tmpPosition);
      mesh.getWorldQuaternion(tmpQuaternion);
      driveBody(prongBodies[index], tmpPosition, tmpQuaternion, dt);
    });
    clawPosed = true;
  }

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
    // Settle, then drop anything that rolled into or onto the chute so the
    // machine never pays out a prize before the first drop.
    for (let step = 0; step < 600; step += 1) world.step(1 / 60);
    const overChute = (ball: Ball) =>
      ball.body.position.y < PIT_Y ||
      (ball.body.position.x < -1.5 + RADIUS &&
        ball.body.position.z > 1.5 - RADIUS);
    for (const ball of balls.filter(overChute)) removeBall(ball);
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
  let clawY = CLAW_MAX_Y;
  let grip = 0;
  let gripTarget = 0;
  let lifted = false;
  let won = false;
  let assisted = false;
  let attempts = Math.random() < 0.5 ? 0 : 1;
  const assistVector = new CANNON.Vec3();
  let resolveDrop: ((result: DropResult) => void) | null = null;
  let revealRoot: THREE.Group | null = null;
  let revealBall: THREE.Group | null = null;
  let revealSprite: THREE.Sprite | null = null;
  let revealTime = 0;

  const setPhase = (next: Phase) => {
    phase = next;
    phaseTime = 0;
  };

  function clearReveal() {
    if (!revealRoot) return;
    scene.remove(revealRoot);
    revealSprite?.material.dispose();
    revealRoot = revealBall = revealSprite = null;
  }

  function startReveal(ball: Ball) {
    clearReveal();
    revealTime = 0;
    revealRoot = new THREE.Group();
    revealRoot.position.set(0, 2.4, 0);
    revealBall = buildBallGroup(BALL_COLORS.indexOf(ball.color));
    revealRoot.add(revealBall);
    const material = new THREE.SpriteMaterial({
      map: prizeTexture(ball.prize),
      transparent: true,
      depthTest: false
    });
    revealSprite = new THREE.Sprite(material);
    revealSprite.renderOrder = 10;
    revealSprite.scale.setScalar(0.001);
    revealRoot.add(revealSprite);
    scene.add(revealRoot);
    removeBall(ball);
    won = true;
    options.onPrize?.(ball.prize);
  }

  function updateReveal(dt: number) {
    if (!revealRoot || !revealBall || !revealSprite) return;
    revealTime += dt;
    if (revealTime > REVEAL_SECONDS) {
      clearReveal();
      return;
    }
    const grow = easeOut(clamp01(revealTime / 0.6));
    revealRoot.position.y = 2.4 + grow * 0.9;
    revealBall.scale.setScalar(0.6 + grow * 1.4);
    revealBall.rotation.y = revealTime * 2;
    const open = easeBack(clamp01((revealTime - 0.6) / 0.5));
    const top = revealBall.getObjectByName('top');
    if (top) {
      top.position.y = open * 0.35;
      top.rotation.z = open * -1.1;
    }
    revealSprite.scale.setScalar(Math.max(0.001, open * 2.1));
    revealSprite.position.y =
      0.6 + open * 1.3 + Math.sin(revealTime * 4) * 0.06;
  }

  function finish(result: DropResult) {
    setPhase('idle');
    resolveDrop?.(result);
    resolveDrop = null;
  }

  function moveClaw(dt: number) {
    const k = Math.min(1, dt * 9);
    pos.x += (target.x - pos.x) * k;
    pos.z += (target.z - pos.z) * k;
  }

  function applyAssist() {
    if (!assisted) return;
    if (phase !== 'closing' && phase !== 'raising' && phase !== 'carrying') {
      return;
    }
    const contactY = clawY - HEAD_HALF_HEIGHT - RADIUS;
    for (const ball of balls) {
      const { position } = ball.body;
      const offset = Math.hypot(position.x - pos.x, position.z - pos.z);
      const gap = position.y - contactY;
      if (offset > ASSIST_RADIUS || gap < -0.35 || gap > ASSIST_REACH) continue;
      const falloff =
        (1 - (0.5 * offset) / ASSIST_RADIUS) *
        (1 - (0.5 * Math.max(0, gap)) / ASSIST_REACH);
      const force = ASSIST_FORCE * falloff * ball.body.mass;
      assistVector.set(
        (pos.x - position.x) * force,
        force,
        (pos.z - position.z) * force
      );
      ball.body.applyForce(assistVector);
      ball.body.wakeUp();
    }
  }

  function stepClaw(dt: number) {
    phaseTime += dt;

    // Award every ball that reached the pit right away so a drop never reports
    // a slip while its prize is still queued; a newer reveal replaces the old one.
    for (const lost of balls.filter((ball) => ball.body.position.y < PIT_Y)) {
      startReveal(lost);
    }
    updateReveal(dt);

    switch (phase) {
      case 'idle':
        gripTarget = 0;
        moveClaw(dt);
        break;
      case 'lowering':
        gripTarget = 0;
        // Finish travelling to the aimed spot before descending.
        if (Math.hypot(target.x - pos.x, target.z - pos.z) > 0.03) {
          moveClaw(dt);
          break;
        }
        clawY = Math.max(CLAW_MIN_Y, clawY - 4 * dt);
        if (clawY === CLAW_MIN_Y) setPhase('closing');
        break;
      case 'closing':
        gripTarget = 1;
        if (grip === 1 && phaseTime > 1.1) setPhase('raising');
        break;
      case 'raising':
        gripTarget = 1;
        clawY = Math.min(CLAW_MAX_Y, clawY + 3 * dt);
        if (clawY === CLAW_MAX_Y) {
          target.x = pos.x;
          target.z = pos.z;
          setPhase('carrying');
        }
        break;
      case 'carrying': {
        gripTarget = 1;
        const dx = chutePosition.x - pos.x;
        const dz = chutePosition.z - pos.z;
        const distance = Math.hypot(dx, dz);
        const step = Math.min(distance, 2.6 * dt);
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
        gripTarget = 0;
        if (phaseTime >= 1.6) {
          finish({ kind: won ? 'prize' : lifted ? 'slip' : 'miss' });
        }
        break;
    }

    if (phase === 'raising' || phase === 'carrying') {
      const tipY = clawY - 0.9;
      if (
        balls.some(
          (ball) =>
            ball.body.position.y > 1.6 &&
            Math.hypot(
              ball.body.position.x - pos.x,
              ball.body.position.z - pos.z
            ) < 0.7 &&
            Math.abs(ball.body.position.y - tipY) < 1.1
        )
      ) {
        lifted = true;
      }
    }

    grip +=
      Math.sign(gripTarget - grip) *
      Math.min(Math.abs(gripTarget - grip), dt * 1.4);

    clawGroup.position.set(pos.x, clawY, pos.z);
    const angle = GRIP_OPEN + (GRIP_CLOSED - GRIP_OPEN) * grip;
    for (const pivot of pivots) pivot.rotation.z = angle;
    trolley.position.set(pos.x, 6, pos.z);
    cable.position.set(pos.x, (6 + clawY) / 2, pos.z);
    cable.scale.y = 6 - clawY;
    driveClawBodies(dt);
    applyAssist();
  }

  // Loop with a fixed physics step so the kinematic claw pushes balls reliably.
  let frameId = 0;
  let last = 0;
  let accumulator = 0;
  function frame(now: number) {
    frameId = requestAnimationFrame(frame);
    accumulator += Math.min(0.1, (now - last) / 1000);
    last = now;
    let steps = 0;
    while (accumulator >= FIXED_STEP && steps < 5) {
      stepClaw(FIXED_STEP);
      world.step(FIXED_STEP);
      accumulator -= FIXED_STEP;
      steps += 1;
    }
    if (steps === 5) accumulator = 0;
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
    const aspect = width / height;
    const halfX = aspect >= 1 ? VIEW_HALF * aspect : VIEW_HALF;
    const halfY = aspect >= 1 ? VIEW_HALF : VIEW_HALF / aspect;
    Object.assign(camera, {
      left: -halfX,
      right: halfX,
      top: halfY,
      bottom: -halfY
    });
    camera.updateProjectionMatrix();
    if (!frameId) renderer.render(scene, camera);
  };

  const raycaster = new THREE.Raycaster();
  const aimPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -AIM_PLANE_Y);
  const pointer = new THREE.Vector2();
  const hit = new THREE.Vector3();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(parent);
  const visibility = new IntersectionObserver(([entry]) => {
    if (entry?.isIntersecting) start();
    else stop();
  });
  visibility.observe(canvas);
  resize();
  fillMachine();
  stepClaw(FIXED_STEP);
  renderer.render(scene, camera);

  return {
    aimAt(clientX, clientY) {
      if (phase !== 'idle') return;
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      pointer.set(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(pointer, camera);
      if (!raycaster.ray.intersectPlane(aimPlane, hit)) return;
      const aimed = clampClaw({ x: hit.x, z: hit.z });
      target.x = aimed.x;
      target.z = aimed.z;
    },
    nudge(next) {
      if (phase !== 'idle') return;
      const moved = clampClaw({
        x: target.x + next.x * 0.3,
        z: target.z + next.z * 0.3
      });
      target.x = moved.x;
      target.z = moved.z;
    },
    drop() {
      if (phase !== 'idle' || balls.length === 0) {
        return Promise.resolve<DropResult>({ kind: 'busy' });
      }
      lifted = false;
      won = false;
      attempts += 1;
      assisted = attempts % 2 === 0;
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
      clearReveal();
      resizeObserver.disconnect();
      visibility.disconnect();
      for (const item of disposables) item.dispose();
      renderer.dispose();
    }
  };
}
