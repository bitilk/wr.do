"use client";

import { useEffect, useState } from "react";
import { User } from "@prisma/client";

// import { useMediaQuery } from "@/hooks/use-media-query";
import EmailList from "@/components/email/EmailList";
import EmailSidebar from "@/components/email/EmailSidebar";

export function EmailDashboard({ user }: { user: User }) {
  const [selectedEmailAddress, setSelectedEmailAddress] = useState<
    string | null
  >(null);
  // const { isTablet } = useMediaQuery();
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);

  const [isCollapsed, setIsCollapsed] = useState(false);

  const [isAdminModel, setAdminModel] = useState(false);

  // useEffect(() => {
  //   setIsCollapsed(!isTablet);
  // }, [isTablet]);

  return (
    <div className="flex h-[calc(100vh-60px)] w-full">
      <EmailSidebar
        className={!isCollapsed ? "w-64 xl:w-72" : "w-16"}
        user={user}
        onSelectEmail={setSelectedEmailAddress}
        selectedEmailAddress={selectedEmailAddress}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        isAdminModel={isAdminModel}
        setAdminModel={setAdminModel}
      />
      <EmailList
        className="flex-1"
        emailAddress={selectedEmailAddress}
        selectedEmailId={selectedEmailId}
        onSelectEmail={setSelectedEmailId}
        isAdminModel={isAdminModel}
      />
    </div>
  );
}
