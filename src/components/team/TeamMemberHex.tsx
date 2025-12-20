"use client";

import { useState } from "react";
import type { TeamMember } from "@/types/team";

const DEFAULT_IMAGE = "/team/default-profile.png";

// --- Configuration ---
const PROFILE_PICTURE_SIZE = 80;
const HEX_POINTS = "50,10 84.64,30 84.64,70 50,90 15.36,70 15.36,30";

function formatTextToLines(text: string, maxCharsPerLine = 15): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const potentialLine = currentLine ? `${currentLine} ${word}` : word;
    if (potentialLine.length <= maxCharsPerLine) {
      currentLine = potentialLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines;
}

export default function TeamMemberHex({ member }: { member: TeamMember }) {
  const [hovered, setHovered] = useState(false);
  const imgSrc = member.image || DEFAULT_IMAGE;
  const clipId = `hexClip-${member.id}`;

  const imageSize = PROFILE_PICTURE_SIZE;
  const imageOffset = (100 - imageSize) / 2;

  const nameLines = formatTextToLines(member.name);
  const positionLines = formatTextToLines(member.position);

  return (
    <div
      className="relative w-full h-full flex items-center justify-center"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* SVG HEX IMAGE */}
      <svg
        className="absolute w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <clipPath id={clipId}>
            <polygon points={HEX_POINTS} />
          </clipPath>
        </defs>

        <image
          x={imageOffset}
          y={imageOffset}
          width={imageSize}
          height={imageSize}
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#${clipId})`}
          href={imgSrc}
        />

        {/* Dark overlay */}
        <polygon
          points={HEX_POINTS}
          fill="black"
          opacity={hovered ? 0.6 : 0}
          style={{ mixBlendMode: "multiply", transition: "opacity 0.3s ease" }}
        />


        {/* Outline */}
        <polygon
          points={HEX_POINTS}
          fill="none"
          stroke="#F6C13D"
          strokeWidth={6}
        />
      </svg>

      {/* TEXT OVERLAY */}
      <div
        className="absolute flex flex-col items-center justify-center text-white px-2"
        style={{
          width: "100%",
          height: "100%",
          clipPath:
            "polygon(50% 10%, 84.64% 30%, 84.64% 70%, 50% 90%, 15.36% 70%, 15.36% 30%)",
          opacity: hovered ? 1 : 0,
          transition: "opacity 0.3s ease",
          pointerEvents: "none",
        }}
      >
        <h3
          className="font-bold text-center"
          style={{ fontSize: "7px", lineHeight: 1.1, maxWidth: "85%" }}
        >
          {nameLines.map((line, i) => (
            <span key={i}>
              {line}
              {i < nameLines.length - 1 && <br />}
            </span>
          ))}
        </h3>

        <p
          className="mt-1 text-center"
          style={{ fontSize: "7px", lineHeight: 1.1, maxWidth: "85%" }}
        >
          {positionLines.map((line, i) => (
            <span key={i}>
              {line}
              {i < positionLines.length - 1 && <br />}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}
