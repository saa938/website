"use client";

import React, { useMemo, useRef, useEffect, useState } from "react";
import TeamMemberHex from "./TeamMemberHex";
import type { TeamMember } from "@/types/team";

// --- Global scale factor for the entire hive ---
const HIVE_SCALE = 0.5;

// --- Configuration: Adjust hexagon size here (in pixels) ---
const HEXAGON_SIZE = 250 * HIVE_SCALE; // Change this value to adjust hexagon size

// --- Configuration: Distance below "Meet Our Team" header (in pixels) ---
const OFFSET_BELOW_HEADER = 700 * HIVE_SCALE; // Change this value to adjust vertical position

// --- Configuration: Horizontal offset from center (in pixels) ---
const HORIZONTAL_OFFSET = 0 * HIVE_SCALE; // Change this value to adjust horizontal position (positive = right, negative = left)

// --- Image mapping: Maps team member names to their image files ---
const IMAGE_MAP: Record<string, string> = {
  "Ashay Sarda": "4526954c591bc1f55f65cfb8499decf7 - Ashay Sarda.png",
  "irunwithscizors": "acnh-tuna-header - Logan Li.jpg",
  "Ethan Chen": "af88d83f60d8f856f74b2d83ec9c799d - Ethan.jpg",
  "Ethan": "af88d83f60d8f856f74b2d83ec9c799d - Ethan.jpg",
  "Henry": "dukechapel - Henry H.jpg",
  "Henry H": "dukechapel - Henry H.jpg",
  "Matthew Belyea": "IMG_0145 - Matthew Belyea.jpeg",
  "Tanay B": "IMG_0810 - Tanay Bollam.jpeg",
  "Tanay Bollam": "IMG_0810 - Tanay Bollam.jpeg",
  "Insomnia": "IMG_1758 - Richard.jpeg",
  "braden_is": "IMG_2502 - Sigma Make.jpeg",
  "Liuren": "IMG_3498 - Pierre-Louis Nguyen.jpg",
  "dlcdeon": "IMG_5289 - deondeluxe.jpeg",
  "Janya": "IMG_6216 - Janya Jain.jpeg",
  "Janya Jain": "IMG_6216 - Janya Jain.jpeg",
  "River Antonov": "IMG_7929 - River Antonov.jpeg",
  "Tal Levy": "it_s the klerd of tal - Tal Levy.jpeg",
  "Panzkd": "kalen-emsley-Bkci_8qcdvQ-unsplash - Hengrui Zhao.jpg",
  "mqax": "mqaxPFP - Max.jpg",
  "Max": "mqaxPFP - Max.jpg",
  "Sprite": "OIP - Sprite Gaming.jpg",
  "Sprite Gaming": "OIP - Sprite Gaming.jpg",
  "Elvis Peng": "OMEGA - Elvis Peng(1).png",
  "Reading": "pfp - Wenbo W.png",
  "Adhitya Sriram": "PXL_20250602_154731213 - Adhitya Sriram.jpg",
  "Sean": "sheep-4810513_1280 - Sean Nguyen.jpg",
  "Sean Nguyen": "sheep-4810513_1280 - Sean Nguyen.jpg",
  "Anmol Nanjundareddy": "superdancer16 - Anmol Nanjundareddy.png",
  "Hector Wang": "unnamed - Hector.png",
  "Hector": "unnamed - Hector.png",
  "Zoe Xue": "ZoeProfile - zox.jpg",
  "Zoe": "ZoeProfile - zox.jpg",
  "Orin Overmiller": "00f9d6ee40f00182bd69d557320d63a2 - orin overmiller.png",
  "anisul": "14d5dbfc447d088546351ce57855adeb - anisul.jpg",
  "assassin3552": "48 - Polaris Li.jpg",
  "Sripaadh Jayashree Kuppusamy": "52e94b8f-71c0-40c6-87b3-51299c73b852 - Sripaadh Jayashree Kuppusamy.JPG",
  "blitzal": "blitzalpfp - Kate Damico.jpg",
  "Kate Damico": "blitzalpfp - Kate Damico.jpg",
  "user_exists": "c95747eb1048ca82305685580ae28cf8 - Nikolas Dyer.png",
  "Hub34": "c1117760e5fafa1f92771b2ed99147e9 - Hub35.png", // corrected filename but kept key
  "A Ashraf": "ChatGPT Image Sep 13, 2025, 09_54_35 PM - Ahmed Ashraf.png",
  "Ahmed Ashraf": "ChatGPT Image Sep 13, 2025, 09_54_35 PM - Ahmed Ashraf.png",
  "Sarah H.": "default_pfp - Sarah H..jpg",
  "southwesternalexcorporation": "IMG_1432 - Alex Saravia.jpeg",
  "Jasmine Gadot": "IMG_2093 - Jasmine Gadot.jpeg",
  "pineappled juice": "IMG_2546 - Mina.jpeg",
  "Jackson D.": "IMG_3156 - Jackson D..webp",
  "suri": "IMG_3641 - Suri Sanchez.jpeg",
  "Suri Sanchez": "IMG_3641 - Suri Sanchez.jpeg",
  "MG8mer": "MG8mer.png",
  "Ali A.": "IMG_8667 - Professional Procrastinator.jpeg",
  "Ian Joo": "IMG-20250901-WA0013 - Ian Joo.jpg", // corrected name in filename
  "Ansh Desai": "IRL Photo for FiveHive - Ansh Desai.jpg",
  "Jacob": "J - Hystix.jpg",
  "mmbcsmen": "mmbcsmen pfp - Father Brandon.jpg",
  "Father Brandon": "mmbcsmen pfp - Father Brandon.jpg",
  "Silas Lovett": "pfp - Silas Lovett.png",
  "Akshaj D": "Profile Picture - Akshaj Donthi.jpg",
  "Akshaj Donthi": "Profile Picture - Akshaj Donthi.jpg",
  "thecoolsavage": "raw - Rayan Zaman.png",
  "dkim19375": "scratch - dkim (dkim19375).png",
  "Scipio H": "Screenshot 2025-07-23 011653 - Scipio H.png",
  "Shreya Suresh": "Shreya Suresh.png",
  "Econ Guy": "ucsdpride - Israel Cube.jpg",
  "Lance Xu": "lance.jpg",
};

// Helper function to get image path for a team member
function getImagePath(name: string): string {
  const imageFile = IMAGE_MAP[name];
  if (!imageFile) {
    console.log(`Default profile selected for: ${name}`);
  }
  return imageFile ? `/team/${imageFile}` : "/team/default-profile.png";
}

// --- data (unchanged, profile images left as default) ---
const centerLeader: TeamMember = {
  id: 1,
  name: "Lance Xu",
  position: "Founder/CEO",
  image: getImagePath("Lance Xu"),
  bio: "",
};

const teamLeads: TeamMember[] = [
  { id: 2, name: "Janya", position: "Data Analysis Sub-Team Lead, Outreach Team Lead", image: getImagePath("Janya"), bio: "" },
  { id: 3, name: "Shreya Suresh", position: "Outreach Team Lead", image: getImagePath("Shreya Suresh"), bio: "" },
  { id: 4, name: "Ethan Chen", position: "Outreach Team Lead", image: getImagePath("Ethan Chen"), bio: "" },
  { id: 5, name: "Scipio H", position: "Survey & FAQ Team Lead", image: getImagePath("Scipio H"), bio: "" },
  { id: 6, name: "Liuren", position: "Review Session, Lecture Sub-Team Lead", image: getImagePath("Liuren"), bio: "" },
  { id: 7, name: "Tal Levy", position: "Review Session Team Lead", image: getImagePath("Tal Levy"), bio: "" },
  { id: 8, name: "Reading", position: "Review Session Team Lead", image: getImagePath("Reading"), bio: "" },
];

const subTeamLeads: TeamMember[] = [
  { id: 9, name: "A Ashraf", position: "Data Analysis Sub-Team Lead", image: getImagePath("A Ashraf"), bio: "" },
  { id: 10, name: "mmbcsmen", position: "Materials Sub-Team Lead", image: getImagePath("mmbcsmen"), bio: "" },
  { id: 11, name: "Ali A.", position: "Materials Sub-Team Lead", image: getImagePath("Ali A."), bio: "" },
  { id: 12, name: "Matthew Belyea", position: "Materials, Lecture Sub-Team Lead", image: getImagePath("Matthew Belyea"), bio: "" },
  { id: 13, name: "Sean", position: "Materials, Lecture Sub-Team Lead", image: getImagePath("Sean"), bio: "" },
  { id: 14, name: "thecoolsavage", position: "Materials, Lecture Sub-Team Lead", image: getImagePath("thecoolsavage"), bio: "" },
  { id: 15, name: "Henry", position: "Lecture Sub-Team Lead", image: getImagePath("Henry"), bio: "" },
];

const members: TeamMember[] = [
  { id: 20, name: "Anmol Nanjundareddy", position: "FAQ Doc, Lecture, Materials Sub-Team Member", image: getImagePath("Anmol Nanjundareddy"), bio: "" },
  { id: 21, name: "Zoe Xue", position: "Materials Sub-Team Member", image: getImagePath("Zoe Xue"), bio: "" },
  { id: 22, name: "Silas Lovett", position: "Website Team Member", image: getImagePath("Silas Lovett"), bio: "" },
  { id: 23, name: "Hector Wang", position: "Lecture, Materials Sub-Team Member", image: getImagePath("Hector Wang"), bio: "" },
  { id: 24, name: "anisul", position: "Outreach Team Member", image: getImagePath("anisul"), bio: "" },
  { id: 25, name: "Ashay Sarda", position: "Website Team Member", image: getImagePath("Ashay Sarda"), bio: "" },
  { id: 26, name: "Insomnia", position: "Lecture, Materials Sub-Team Member", image: getImagePath("Insomnia"), bio: "" },
  { id: 27, name: "mqax", position: "Survey, Data Analysis Sub-Team Member", image: getImagePath("mqax"), bio: "" },
  { id: 28, name: "Econ Guy", position: "Lecture Sub-Team Member", image: getImagePath("Econ Guy"), bio: "" },
  { id: 29, name: "pineappled juice", position: "Lecture Sub-Team Member", image: getImagePath("pineappled juice"), bio: "" },
  { id: 30, name: "assassin3552", position: "Materials Sub-Team Member", image: getImagePath("assassin3552"), bio: "" },
  { id: 31, name: "Tanay B", position: "Lecture, Materials Sub-Team Member", image: getImagePath("Tanay B"), bio: "" },
  { id: 32, name: "blitzal", position: "Materials Sub-Team Member", image: getImagePath("blitzal"), bio: "" },
  { id: 33, name: "Panzkd", position: "Lecture, Materials Sub-Team Member", image: getImagePath("Panzkd"), bio: "" },
  { id: 34, name: "Sripaadh Jayashree Kuppusamy", position: "FAQ Doc, Lecture, Materials Sub-Team Member", image: getImagePath("Sripaadh Jayashree Kuppusamy"), bio: "" },
  { id: 35, name: "suri", position: "Survey, FAQ Doc Sub-Team Member", image: getImagePath("suri"), bio: "" },
  { id: 36, name: "Jacob", position: "Materials Sub-Team Member", image: getImagePath("Jacob"), bio: "" },
  { id: 37, name: "Jasmine Gadot", position: "Lecture, Materials Sub-Team Member", image: getImagePath("Jasmine Gadot"), bio: "" },
  { id: 38, name: "Elvis Peng", position: "Materials Sub-Team Member", image: getImagePath("Elvis Peng"), bio: "" },
  { id: 39, name: "Jackson D.", position: "Lecture Sub-Team Member", image: getImagePath("Jackson D."), bio: "" },
  { id: 40, name: "River Antonov", position: "Lecture, Materials Sub-Team Member", image: getImagePath("River Antonov"), bio: "" },
  { id: 41, name: "braden_is", position: "Lecture, Materials Sub-Team Member", image: getImagePath("braden_is"), bio: "" },
  { id: 42, name: "Ian Joo", position: "Data Analysis, Outreach Team Member", image: getImagePath("Ian Joo"), bio: "" },
  { id: 43, name: "Ansh Desai", position: "Lecture, Materials Sub-Team Member", image: getImagePath("Ansh Desai"), bio: "" },
  { id: 44, name: "Sprite", position: "Lecture, Data Analysis Sub-Team Member", image: getImagePath("Sprite"), bio: "" },
  { id: 45, name: "Hub34", position: "Lecture, Materials Sub-Team Member", image: getImagePath("Hub34"), bio: "" },
  { id: 46, name: "user_exists", position: "Lecture, Materials Sub-Team Member", image: getImagePath("user_exists"), bio: "" },
  { id: 47, name: "Akshaj D", position: "Data Analysis Sub-Team Member", image: getImagePath("Akshaj D"), bio: "" },
  { id: 48, name: "Adhitya Sriram", position: "Lecture Sub-Team Member", image: getImagePath("Adhitya Sriram"), bio: "" },
  { id: 49, name: "irunwithscizors", position: "Lecture Sub-Team Member", image: getImagePath("irunwithscizors"), bio: "" },
  { id: 50, name: "dkim19375", position: "Survey Sub-Team Member", image: getImagePath("dkim19375"), bio: "" },
  { id: 51, name: "Sarah H.", position: "Survey, Data Analysis, FAQ Doc Sub-Team Member", image: getImagePath("Sarah H."), bio: "" },
  { id: 52, name: "SWalexcorporation", position: "Lecture, Materials Sub-Team Member", image: getImagePath("southwesternalexcorporation"), bio: "" },
  { id: 53, name: "Orin Overmiller", position: "Materials Sub-Team Member", image: getImagePath("Orin Overmiller"), bio: "" },
  { id: 54, name: "MG8mer", position: "Lecture Sub-Team Member", image: getImagePath("MG8mer"), bio: "" },
  { id: 55, name: "dlcdeon", position: "Survey, Data Analysis, FAQ Doc Sub-Team Member", image: getImagePath("dlcdeon"), bio: "" },
];

// --- Helpers: hex grid generation (axial coords) ---
function hexRange(radius: number) {
  const results: { q: number; r: number }[] = [];
  for (let q = -radius; q <= radius; q++) {
    const r1 = Math.max(-radius, -q - radius);
    const r2 = Math.min(radius, -q + radius);
    for (let r = r1; r <= r2; r++) {
      results.push({ q, r });
    }
  }
  return results;
}

function axialDistance(a: { q: number; r: number }) {
  const x = a.q;
  const z = a.r;
  const y = -x - z;
  return Math.max(Math.abs(x), Math.abs(y), Math.abs(z));
}

function toPixel(q: number, r: number, size: number, originX: number, originY: number) {
  // pointy-top axial to pixel
  const x = size * Math.sqrt(3) * (q + r / 2) + originX;
  const y = size * (3 / 2) * r + originY;
  return { x, y };
}

function shuffleArray<T>(arr: (T | undefined)[]): T[] {
  const a = arr.slice() as T[];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i]!;
    a[i] = a[j]!;
    a[j] = tmp;
  }
  return a;
}

export default function TeamHive() {
  // hex size (px) — uses HEXAGON_SIZE constant defined at top of file
  const hexSize = HEXAGON_SIZE;
  
  // Calculate hexagon radius for spacing (hexagon spans 80 units out of 100 in viewBox, so radius is 40 units = 0.4 * container size)
  const hexRadius = hexSize * 0.4;
  
  // Use ref to get container dimensions
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 1400 * HIVE_SCALE, height: 1400 * HIVE_SCALE});
  
  // Update container dimensions on mount and resize only (not on scroll)
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        // Use the container's width, but calculate height based on content
        const width = containerRef.current.clientWidth || window.innerWidth;
        // Use a fixed large height to accommodate all hexagons
        const height = containerRef.current.scrollHeight;
        setContainerDimensions({ width, height});
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  // Canvas size - use container dimensions
  const canvasWidth = containerDimensions.width;
  const canvasHeight = containerDimensions.height;
  const centerX = (canvasWidth / 2) + HORIZONTAL_OFFSET; // Position center hex with horizontal offset
  const centerY = OFFSET_BELOW_HEADER; // Position center hex at the offset distance

  // pick a radius that fits all team members comfortably. radius 4 gives 61 cells.
  const radius = 4;

  // generate all hex positions for the chosen radius
  const allHexes = useMemo(() => hexRange(radius).map((p) => ({ ...p, dist: axialDistance(p) })), [radius]);

  // derive rings
  const centerHex = allHexes.find((h) => h.dist === 0)!;
  const ring1Hexes = allHexes.filter((h) => h.dist === 1).sort((a, b) => a.q - b.q || a.r - b.r);
  const ring2Hexes = allHexes.filter((h) => h.dist === 2).sort((a, b) => a.q - b.q || a.r - b.r);
  const outerHexes = allHexes.filter((h) => h.dist >= 3).sort((a, b) => a.dist - b.dist || a.q - b.q || a.r - b.r);

  // Prepare pools for filling inwards to outwards to avoid inner gaps
  const overflowLeads = teamLeads.slice(6); // any extra leads beyond 6

  // Shuffle members only part to randomize outer placement but keep leads together.
  // Use useMemo so the shuffle runs when the underlying pools change.
  const shuffledMembersPool = useMemo(() => {
    const mems = members.slice();
    return [...overflowLeads, ...subTeamLeads, ...mems];
  }, []); // Empty deps - only shuffle once on mount, not on every render

  // Memoize the entire assignment logic so it doesn't recalculate on dimension changes
  // This prevents shuffling when window height/width changes
  const assigned = useMemo(() => {
    // Create a working copy that we can mutate with shift()
    const workingPool = [...shuffledMembersPool];

    // assigned array
    const result: { hex: { q: number; r: number; dist: number }; member?: TeamMember; role?: string }[] = [];

    // center
    result.push({ hex: centerHex, member: centerLeader, role: "center" });

    // ring1 -> team leads (first 6). If fewer than 6, pull from subTeamLeads/members pool to fill.
    ring1Hexes.forEach((hex, i) => {
      const m = teamLeads[i] ?? workingPool.shift();
      result.push({ hex, member: m, role: m ? (i < teamLeads.length ? "team-lead" : "sub-lead") : undefined });
    });

    // ring2 -> fill entirely from remaining pool (this includes overflow leads & all subTeamLeads first, then members)
    ring2Hexes.forEach((hex) => {
      const m = workingPool.shift();
      result.push({ hex, member: m, role: m ? "sub-lead-or-member" : undefined });
    });

    // outer hexes -> remaining members
    outerHexes.forEach((hex) => {
      const m = workingPool.shift();
      result.push({ hex, member: m, role: m ? "member" : undefined });
    });

    // ---------------------------
    // Small tweak: move leftmost and rightmost placed hexes to top row (r === -radius)
    // This finds the assigned hex with minimum screen X and maximum screen X, and moves
    // their hex coordinates onto available top-row positions (to avoid overlap).
    // Use a fixed reference width (1400) to determine extremes, not dynamic centerX
    // ---------------------------
    (function moveExtremesToTopRow() {
      // Use a fixed reference centerX for determining extremes to avoid position changes on resize
      const referenceCenterX = 1400 / 2 + HORIZONTAL_OFFSET;
      // helper to compute pixel for an assigned hex using reference position
      const pixelFor = (h: { q: number; r: number }) => toPixel(h.q, h.r, hexRadius, referenceCenterX, OFFSET_BELOW_HEADER);

      // find top-row hexes (r === -radius) that are not already occupied
      const occupiedSet = new Set(result.map((a) => `${a.hex.q},${a.hex.r}`));
      const topRowCandidates = allHexes
        .filter((h) => h.r === -radius && !occupiedSet.has(`${h.q},${h.r}`))
        .sort((a, b) => a.q - b.q); // choose left-to-right on top row

      if (topRowCandidates.length === 0) return; // nothing to move to

      // compute assigned with actual pixel X using reference position
      const assignedWithPx = result.map((a) => ({ a, px: pixelFor(a.hex) }));

      // skip elements with no member (empty cell) when choosing extremes
      const occupiedAssigned = assignedWithPx.filter((x) => x.a.member);

      if (occupiedAssigned.length === 0) return;

      // find index (in 'result' array) of leftmost and rightmost placed members
      let leftmostIdx = -1;
      let rightmostIdx = -1;
      let minX = Infinity;
      let maxX = -Infinity;

      for (let i = 0; i < assignedWithPx.length; i++) {
        const item = assignedWithPx[i];
        if (!item) continue; // <- check for undefined
        if (!item.a.member) continue;

        if (item.px.x < minX) {
          minX = item.px.x;
          leftmostIdx = i;
        }
        if (item.px.x > maxX) {
          maxX = item.px.x;
          rightmostIdx = i;
        }
      }

      // if no valid extremes, return
      if (leftmostIdx === -1 || rightmostIdx === -1) return;

      // assign them to the first available top-row candidates (avoid swapping into the same slot)
      // prefer to place leftmost into left-most top candidate, rightmost into next top candidate (or same if only one)
      const newTopForLeft = topRowCandidates.shift();
      const newTopForRight = topRowCandidates.shift();

      // if there was only one top candidate available, place both into it is not allowed; just place one.
      if (!newTopForLeft) return;

      function setAssignedHex(idx: number, hexValue: typeof newTopForLeft | undefined) {
        if (idx >= 0 && idx < result.length && hexValue) {
          const item = result[idx];
          if (item) item.hex = { ...hexValue, dist: axialDistance(hexValue) };
        }
      }

      setAssignedHex(leftmostIdx, newTopForLeft);
      if (newTopForRight && rightmostIdx !== leftmostIdx) setAssignedHex(rightmostIdx, newTopForRight);

    })();

    return result;
  }, [shuffledMembersPool, centerHex, ring1Hexes, ring2Hexes, outerHexes, allHexes, hexRadius]);

  // Calculate center hex position - it should be at the center of the canvas
  // (variable removed because it's not used)

  return (
    <div 
      ref={containerRef}
      className="relative w-full"
      style={{ 
        width: '100%',
        height: canvasHeight,
        minHeight: canvasHeight
      }}
    >
      <div 
        className="relative bg-white/0 w-full h-full" 
      >
        {/* draw all assigned hexes */}
        {assigned.map((a) => {
          const { q, r } = a.hex;
          const px = toPixel(q, r, hexRadius, centerX, centerY);
          const left = px.x - hexSize / 2;
          const top = px.y - hexSize / 2;
          // z-index below navbar (navbar has z-40 = 40) so hexagons scroll behind it
          const zIndex = 30 - a.hex.dist; // Values from 30 down, all below 40
          return (
            <div key={`${q},${r}`} style={{ position: "absolute", left, top, width: hexSize, height: hexSize, zIndex, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {a.member ? <TeamMemberHex member={a.member} /> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}