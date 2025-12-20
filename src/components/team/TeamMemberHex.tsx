"use client";

import { useState } from "react";
import type { TeamMember } from "@/types/team";

const DEFAULT_IMAGE = "/team/default-profile.png";

// --- Configuration: Profile picture size (as percentage of hexagon, 0-100) ---
const PROFILE_PICTURE_SIZE = 80; // Change this value to adjust image size (100 = fills hexagon, smaller = zoomed in)

// Regular hexagon: centered at (50, 50) with radius 40
// Points calculated for pointy-top orientation with equal sides and angles
const HEX_POINTS = "50,10 84.64,30 84.64,70 50,90 15.36,70 15.36,30";

// Format text to 25 characters per line, ensuring words don't break across lines
function formatTextToLines(text: string, maxCharsPerLine = 15): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    // If adding this word would exceed the limit
    const potentialLine = currentLine ? `${currentLine} ${word}` : word;
    
    if (potentialLine.length <= maxCharsPerLine) {
      // Word fits on current line
      currentLine = potentialLine;
    } else {
      // Word doesn't fit
      if (currentLine) {
        // Save current line and start new one
        lines.push(currentLine);
        currentLine = word;
      } else {
        // Word is longer than maxCharsPerLine, add it anyway (can't break it)
        lines.push(word);
        currentLine = "";
      }
    }
  }

  // Add the last line if it exists
  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

export default function TeamMemberHex({ member }: { member: TeamMember }) {
  const [hovered, setHovered] = useState(false); // Start with image showing (not hovered)
  const imgSrc = member.image || DEFAULT_IMAGE;
  const clipId = `hexClip-${member.id}`;
  
  // Calculate image size and position based on PROFILE_PICTURE_SIZE
  const imageSize = PROFILE_PICTURE_SIZE;
  const imageOffset = (100 - imageSize) / 2; // Center the image
  
  // Format name and position text
  const nameLines = formatTextToLines(member.name);
  const positionLines = formatTextToLines(member.position);

  return (
    <div
      className="relative inline-block w-full h-full flex items-center justify-center"
      style={{ perspective: "1000px" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="w-full h-full transition-transform duration-700"
        style={{
          transformStyle: "preserve-3d",
          transform: hovered ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        <svg
          className="absolute w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
          xmlnsXlink="http://www.w3.org/1999/xlink"
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid meet"
          style={{ backfaceVisibility: "hidden", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
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
            xlinkHref={imgSrc}
          />
          <polygon
            points={HEX_POINTS}
            fill="none"
            stroke="#F6C13D"
            strokeWidth={6}
          />
        </svg>

        <svg
          className="absolute w-full h-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid meet"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            backfaceVisibility: "hidden",
            transform: "translate(-50%, -50%) rotateY(180deg)",
            top: "50%",
            left: "50%",
          }}
        >
          <polygon
            points={HEX_POINTS}
            fill="#EF7A3D"
            stroke="#F6C13D"
            strokeWidth={6}
          />
        </svg>

        <div
          className="absolute flex flex-col items-center justify-center text-white px-2"
          style={{
            backfaceVisibility: "hidden",
            transform: "translate(-50%, -50%) rotateY(180deg)",
            top: "50%",
            left: "50%",
            width: "100%",
            height: "100%",
            clipPath: `polygon(50% 10%, 84.64% 30%, 84.64% 70%, 50% 90%, 15.36% 70%, 15.36% 30%)`,
            backgroundColor: "#EF7A3D"
          }}
        >
          <h3 className="font-bold text-sm text-center" style={{ maxWidth: "85%", fontSize: '7px', lineHeight: 1.1 }}>
            {nameLines.map((line, index) => (
              <span key={index}>
                {line}
                {index < nameLines.length - 1 && <br />}
              </span>
            ))}
          </h3>
          <p className="text-xs mt-1 text-center" style={{ maxWidth: "85%", fontSize: '7px', lineHeight: 1.1}}>
            {positionLines.map((line, index) => (
              <span key={index}>
                {line}
                {index < positionLines.length - 1 && <br />}
              </span>
            ))}
          </p>
        </div>
      </div>
    </div>
  );
}