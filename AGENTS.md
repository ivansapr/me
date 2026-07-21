# Project bookshelf workflow

The homepage is data-driven. Add projects through `npm run project:new -- --slug <slug> --title <title> --description <description> --url <https-url>` and review the generated registry entry before committing.

Project visuals must stay isolated in `src/lib/projects`. The shared `ProjectCard` owns layout, heading/description semantics, outbound navigation, and Umami project-open tracking. A visual must accept `ProjectCardVisualProps`, keep its color palette inside the card, and make every interactive control keyboard and touch accessible.

Run `npm run check`, `npm run lint`, `npm test`, and `npm run build` before opening a pull request. Do not add card-specific navigation or analytics events without updating the card plan.
