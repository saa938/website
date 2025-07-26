"use client";

import { useState } from "react";
import TeamMemberHex from "./TeamMemberHex";
import { TeamMember } from "@/types/team";

// Sample team data - can be easily updated with real information
const teamMembers: TeamMember[] = [
  {
    id: 1,
    name: "Alex Rivera",
    position: "CEO & Founder",
    image: "/team/placeholder-1.jpg",
    bio: "Passionate about education technology and helping students succeed."
  },
  {
    id: 2,
    name: "Jordan Kim",
    position: "CTO",
    image: "/team/placeholder-2.jpg",
    bio: "Full-stack developer with a love for creating intuitive user experiences."
  },
  {
    id: 3,
    name: "Casey Thompson",
    position: "Lead Developer",
    image: "/team/placeholder-3.jpg",
    bio: "Frontend specialist focused on performance and accessibility."
  },
  {
    id: 4,
    name: "Morgan Davis",
    position: "UX Designer",
    image: "/team/placeholder-4.jpg",
    bio: "Design enthusiast creating beautiful and functional interfaces."
  },
  {
    id: 5,
    name: "Riley Chen",
    position: "Content Director",
    image: "/team/placeholder-5.jpg",
    bio: "AP curriculum expert ensuring quality educational content."
  },
  {
    id: 6,
    name: "Taylor Brooks",
    position: "Marketing Lead",
    image: "/team/placeholder-6.jpg",
    bio: "Spreading the word about FiveHive to help more students."
  },
  {
    id: 7,
    name: "Avery Singh",
    position: "Backend Engineer",
    image: "/team/placeholder-7.jpg",
    bio: "Infrastructure expert keeping everything running smoothly."
  }
];

export default function TeamHive() {
  return (
    <div className="flex justify-center items-center min-h-[600px]">
      {/* Center container with fixed width like the CSS example */}
      <div className="relative w-[612px]">
        {/* Row 1: 3 hexagons - odd row (offset) */}
        <div className="relative ml-[76.5px] mb-[-38px]">
          <TeamMemberHex member={teamMembers[0]} className="inline-block" />
          <TeamMemberHex member={teamMembers[1]} className="inline-block" />
          <TeamMemberHex member={teamMembers[2]} className="inline-block" />
        </div>
        
        {/* Row 2: 4 hexagons - even row (no offset) */}
        <div className="relative mb-[-38px]">
          <TeamMemberHex member={teamMembers[3]} className="inline-block" />
          <TeamMemberHex member={teamMembers[4]} className="inline-block" />
          <TeamMemberHex member={teamMembers[5]} className="inline-block" />
          <TeamMemberHex member={teamMembers[6]} className="inline-block" />
        </div>
        
        {/* Row 3: 3 hexagons - odd row (offset) */}
        <div className="relative ml-[76.5px]">
          <TeamMemberHex 
            member={{
              id: 8,
              name: "Phoenix Martinez",
              position: "QA Engineer",
              image: "/team/placeholder-8.jpg",
              bio: "Quality assurance specialist ensuring perfect user experiences."
            }} 
            className="inline-block" 
          />
          <TeamMemberHex 
            member={{
              id: 9,
              name: "Sage Williams",
              position: "Product Manager",
              image: "/team/placeholder-9.jpg",
              bio: "Strategic product leader driving innovation and growth."
            }} 
            className="inline-block" 
          />
          <TeamMemberHex 
            member={{
              id: 10,
              name: "River Johnson",
              position: "DevOps Engineer",
              image: "/team/placeholder-10.jpg",
              bio: "Infrastructure architect ensuring scalable and reliable systems."
            }} 
            className="inline-block" 
          />
        </div>
      </div>
    </div>
  );
}