import gsap from "gsap";

const EDGE_DEFAULT = "rgba(255, 255, 255, 0.4)";
const NODE_BORDER_DEFAULT = "rgba(255, 255, 255, 0.2)";

export const EDGE_CLASSES = {
  usersToUq: "edge-users-uq",
  uqToQualifications: "edge-uq-qualifications",
  equipmentToReqs: "edge-equipment-reqs",
  reqsToQualifications: "edge-reqs-qualifications",
  equipmentToBookings: "edge-equipment-bookings",
};

function edgePath(cls: string): SVGPathElement | null {
  return document.querySelector(`.${cls} .react-flow__edge-path`);
}

function dashEdge(cls: string, duration = 0.5): gsap.core.Tween | null {
  const path = edgePath(cls);
  if (!path) return null;
  const len = path.getTotalLength();
  return gsap.fromTo(
    path,
    { strokeDasharray: len, strokeDashoffset: len },
    {
      strokeDashoffset: 0,
      duration,
      ease: "power1.inOut",
      onComplete: () => {
        gsap.set(path, { strokeDasharray: "none" });
      },
    }
  );
}

export function resetVisualState() {
  document
    .querySelectorAll<SVGPathElement>(".react-flow__edge-path")
    .forEach((p) => {
      gsap.set(p, { stroke: EDGE_DEFAULT, strokeDasharray: "none", strokeDashoffset: 0 });
    });
  document
    .querySelectorAll<HTMLElement>("[data-table]")
    .forEach((n) => {
      gsap.set(n, { borderColor: NODE_BORDER_DEFAULT, x: 0, y: 0 });
    });
  document
    .querySelectorAll<HTMLElement>("[data-user-id],[data-qualification-id],[data-booking-id],[data-resource-id]")
    .forEach((r) => {
      gsap.set(r, { outlineColor: "transparent", x: 0, backgroundColor: "transparent", opacity: 1 });
    });
}

export interface DivisionAnimationOpts {
  userId: number;
  passed: boolean;
  missingQualificationIds: number[];
}

export function runDivisionAnimation(opts: DivisionAnimationOpts) {
  resetVisualState();

  const userRow = document.querySelector<HTMLElement>(
    `[data-table="users"] [data-user-id="${opts.userId}"]`
  );
  const traversed = [
    EDGE_CLASSES.usersToUq,
    EDGE_CLASSES.equipmentToReqs,
    EDGE_CLASSES.reqsToQualifications,
  ];
  const targetNodes = [
    document.querySelector<HTMLElement>('[data-table="user_qualifications"]'),
    document.querySelector<HTMLElement>('[data-table="equipment_requirements"]'),
    document.querySelector<HTMLElement>('[data-table="qualifications"]'),
  ].filter(Boolean) as HTMLElement[];

  const tl = gsap.timeline();

  if (userRow) {
    tl.fromTo(
      userRow,
      { outlineColor: "#ffffff", backgroundColor: "rgba(255,255,255,0.2)" },
      { outlineColor: "transparent", backgroundColor: "transparent", duration: 0.25, repeat: 1, yoyo: true }
    );
  }

  traversed.forEach((cls) => {
    const tween = dashEdge(cls, 0.45);
    if (tween) tl.add(tween, ">");
  });

  if (opts.passed) {
    traversed.forEach((cls) => {
      const p = edgePath(cls);
      if (p) tl.to(p, { stroke: "#4ade80", duration: 0.4, ease: "power2.out" }, ">-0.05");
    });
    targetNodes.forEach((n) => {
      tl.to(n, { borderColor: "#4ade80", duration: 0.4, ease: "power2.out" }, "<");
    });
  } else {
    const failEdge = edgePath(EDGE_CLASSES.reqsToQualifications);
    if (failEdge) tl.to(failEdge, { stroke: "#f87171", duration: 0.3 });
    opts.missingQualificationIds.forEach((qid) => {
      const row = document.querySelector<HTMLElement>(
        `[data-table="qualifications"] [data-qualification-id="${qid}"]`
      );
      if (row) {
        tl.to(row, { outlineColor: "#dc2626", backgroundColor: "rgba(220,38,38,0.2)", duration: 0.15 }, "<");
        tl.to(row, {
          keyframes: [{ x: -3 }, { x: 3 }, { x: -3 }, { x: 3 }, { x: 0 }],
          duration: 0.3,
        });
      }
    });
  }
}

export interface InsertAnimationOpts {
  conflict: boolean;
  newBookingId?: number;
}

export function runInsertAnimation(opts: InsertAnimationOpts) {
  resetVisualState();
  const tl = gsap.timeline();

  const tween = dashEdge(EDGE_CLASSES.equipmentToBookings, 0.5);
  if (tween) tl.add(tween);

  const bookingsNode = document.querySelector<HTMLElement>('[data-table="bookings"]');

  if (opts.conflict) {
    if (bookingsNode) {
      tl.fromTo(
        bookingsNode,
        { borderColor: "#ef4444" },
        { borderColor: NODE_BORDER_DEFAULT, duration: 0.4 }
      );
      tl.to(
        bookingsNode,
        {
          keyframes: [{ x: -4 }, { x: 4 }, { x: -3 }, { x: 3 }, { x: 0 }],
          duration: 0.4,
        },
        "<"
      );
    }
  } else {
    const p = edgePath(EDGE_CLASSES.equipmentToBookings);
    if (p) tl.to(p, { stroke: "#4ade80", duration: 0.4, ease: "power2.out" });
    if (opts.newBookingId !== undefined) {
      const row = document.querySelector<HTMLElement>(
        `[data-table="bookings"] [data-booking-id="${opts.newBookingId}"]`
      );
      if (row) {
        tl.fromTo(row, { opacity: 0 }, { opacity: 1, duration: 0.3 });
        tl.fromTo(
          row,
          { backgroundColor: "#bbf7d0" },
          { backgroundColor: "transparent", duration: 1.0, ease: "power2.out" },
          "<"
        );
      }
    }
  }
}

export function revealConsoleLines(container: HTMLElement | null) {
  if (!container) return;
  gsap.fromTo(
    Array.from(container.children),
    { opacity: 0, y: 4 },
    { opacity: 1, y: 0, duration: 0.25, stagger: 0.08, ease: "power2.out", overwrite: true }
  );
}
