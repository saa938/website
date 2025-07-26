"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { TeamMember } from "@/types/team";

interface TeamMemberHexProps {
  member: TeamMember;
  className?: string;
}

export default function TeamMemberHex({ member, className }: TeamMemberHexProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={cn("inline-block transition-transform duration-700 ease-in-out", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        transformStyle: 'preserve-3d',
        transform: isHovered ? 'rotateY(180deg)' : 'rotateY(0deg)'
      }}
    >
      <div className="relative w-[150px] h-[150px]">
        {/* Front face - Picture */}
        <div
          className="absolute inset-0 w-full h-full bg-gradient-to-br from-yellow-400/20 to-amber-500/30 shadow-lg hover:shadow-xl transition-shadow duration-300"
          style={{
            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
            backfaceVisibility: 'hidden'
          }}
        >
          <div
            className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden relative"
            style={{
              clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
            }}
          >
            {/* Picture placeholder - this will be replaced with actual images */}
            <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700 flex items-center justify-center">
              <div className="text-gray-600 dark:text-gray-300 text-6xl">
                👤
              </div>
            </div>
            
            {/* Optional: Image element for when you have actual photos */}
            {/* <Image 
              src={member.image} 
              alt={member.name}
              fill
              className="object-cover"
              style={{
                clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
              }}
            /> */}
          </div>
        </div>

        {/* Back face - Name and Position */}
        <div
          className="absolute inset-0 w-full h-full bg-gradient-to-br from-yellow-500/95 to-amber-600/95 shadow-lg"
          style={{
            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
        >
          <div
            className="w-full h-full flex flex-col items-center justify-center p-4 text-center text-white"
            style={{
              clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
            }}
          >
            <h3 className="font-bold text-base mb-2 leading-tight drop-shadow-sm">
              {member.name}
            </h3>
            <p className="text-sm opacity-90 leading-tight drop-shadow-sm">
              {member.position}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}