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
        {/* Front face - Picture ONLY */}
        <div
          className="absolute inset-0 w-full h-full bg-white shadow-lg hover:shadow-xl transition-shadow duration-300"
          style={{
            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
            backfaceVisibility: 'hidden'
          }}
        >
          <div
            className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center overflow-hidden"
            style={{
              clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
            }}
          >
            {/* Picture placeholder - this will be replaced with actual team photos */}
            <div className="text-gray-400 text-6xl">
              👤
            </div>
            
            {/* When you have real photos, uncomment this and remove the placeholder above */}
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

        {/* Back face - NAME and POSITION text ONLY */}
        <div
          className="absolute inset-0 w-full h-full bg-gradient-to-br from-yellow-500 to-amber-600 shadow-lg"
          style={{
            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
        >
          <div
            className="w-full h-full flex flex-col items-center justify-center p-4 text-center"
            style={{
              clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
            }}
          >
            <h3 className="font-bold text-white text-lg mb-2 leading-tight drop-shadow-lg">
              {member.name}
            </h3>
            <p className="text-white text-sm opacity-95 leading-tight drop-shadow-md">
              {member.position}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}