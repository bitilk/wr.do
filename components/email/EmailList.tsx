"use client";

import { useEffect, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ForwardEmail } from "@prisma/client";
import { toast } from "sonner";
import useSWR from "swr";

import { cn, fetcher, htmlToText, timeAgo } from "@/lib/utils";

import { Icons } from "../shared/icons";
import { PaginationWrapper } from "../shared/pagination";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Skeleton } from "../ui/skeleton";
import { Switch } from "../ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import EmailDetail from "./EmailDetail";
import Loader from "./Loader";

import "react-quill/dist/quill.snow.css";

import { BlurImg } from "../shared/blur-image";
import { Checkbox } from "../ui/checkbox";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "../ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });

interface EmailListProps {
  emailAddress: string | null;
  selectedEmailId: string | null;
  onSelectEmail: (emailId: string | null) => void;
  className?: string;
  isAdminModel: boolean;
}

export default function EmailList({
  emailAddress,
  selectedEmailId,
  onSelectEmail,
  className,
  isAdminModel,
}: EmailListProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAutoRefresh, setIsAutoRefresh] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showSendDrawer, setShowSendDrawer] = useState(false);
  const [sendForm, setSendForm] = useState({ to: "", subject: "", html: "" });
  const [isPending, startTransition] = useTransition();
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);

  const [showMutiCheckBox, setShowMutiCheckBox] = useState(false);

  const { data, error, isLoading, mutate } = useSWR<{
    total: number;
    list: ForwardEmail[];
  }>(
    emailAddress
      ? `/api/email/inbox?emailAddress=${emailAddress}&page=${currentPage}&size=${pageSize}`
      : null,
    fetcher,
    {
      refreshInterval: isAutoRefresh ? 5000 : 0,
      dedupingInterval: 2000, // 避免短时间内重复请求
    },
  );

  // 切换email address时,清空选中的email
  useEffect(() => {
    if (emailAddress && selectedEmailId) {
      const emailExists = data?.list.some(
        (email) => email.id === selectedEmailId,
      );
      if (!emailExists) {
        onSelectEmail(null);
      }
    }
  }, [emailAddress, data, selectedEmailId]);

  if (!emailAddress) {
    return (
      <div className="grids flex flex-1 animate-fade-in flex-col items-center justify-center p-4 text-center text-neutral-600 dark:text-neutral-400">
        <BlurImg
          className="size-40"
          src="/_static/landing/mailbox.svg"
          height={200}
          width={200}
        />

        <h2 className="my-2 text-lg font-semibold">
          No Email Address Selected
        </h2>

        <p className="max-w-md text-sm">
          Please select an email address from the list to view your inbox. Once
          selected, your emails will appear here automatically.
        </p>

        <ul className="mt-3 list-disc text-left">
          <li>
            <Link
              className="text-blue-500 underline"
              href="/docs/emails#how-it-works"
              target="_blank"
              rel="noreferrer"
            >
              How to use email to send or receive emails?
            </Link>
          </li>
          <li>
            <Link
              className="text-blue-500 underline"
              href="/docs/emails#expiration"
              target="_blank"
              rel="noreferrer"
            >
              Will my email or inbox expire?
            </Link>
          </li>
          <li>
            <Link
              className="text-blue-500 underline"
              href="/docs/emails#limit"
              target="_blank"
              rel="noreferrer"
            >
              What is the limit? It&apos;s free?
            </Link>
          </li>
        </ul>

        <div className="mt-6 flex gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-neutral-300 dark:bg-neutral-600" />
          <span className="h-2 w-2 animate-pulse rounded-full bg-neutral-300 delay-100 dark:bg-neutral-600" />
          <span className="h-2 w-2 animate-pulse rounded-full bg-neutral-300 delay-200 dark:bg-neutral-600" />
        </div>
      </div>
    );
  }

  // 处理单封邮件标记为已读
  const handleMarkAsRead = async (emailId: string) => {
    try {
      await fetch("/api/email/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailId }),
      }).then(() => mutate());
    } catch (error) {
      console.log("Error marking email as read");
    }
  };

  // 处理批量标记为已读
  const handleMarkSelectedAsRead = async () => {
    if (selectedEmails.length === 0) {
      toast.error("Please select at least one email");
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/email/read", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emailIds: selectedEmails }),
        });

        if (response.ok) {
          setSelectedEmails([]);
          mutate();
        } else {
          const errorData = await response.json();
          toast.error(errorData.error || "Failed to mark emails as read");
        }
      } catch (error) {
        toast.error("Error marking emails as read");
      }
    });
  };

  // 处理邮件选择
  const handleSelectEmail = (emailId: string) => {
    console.log(emailId);

    setSelectedEmails((prev) =>
      prev.includes(emailId)
        ? prev.filter((id) => id !== emailId)
        : [...prev, emailId],
    );
  };

  const handleSetAutoRefresh = (value: boolean) => {
    setIsAutoRefresh(value);
  };

  const handleManualRefresh = async () => {
    if (!isAutoRefresh) {
      setIsRefreshing(true);
      await mutate();
      setIsRefreshing(false);
    }
  };

  const handleOpenSendEmailModal = () => {
    setShowSendDrawer(true);
    setSendForm({ to: "", subject: "", html: "" });
  };

  const handleSendEmail = async () => {
    if (!emailAddress) {
      toast.error("No email address selected");
      return;
    }
    if (!sendForm.to || !sendForm.subject || !sendForm.html) {
      toast.error("Please fill in all fields");
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/email/send", {
          method: "POST",
          body: JSON.stringify({
            from: emailAddress,
            to: sendForm.to,
            subject: sendForm.subject,
            html: sendForm.html,
          }),
        });

        if (response.ok) {
          toast.success("Email sent successfully");
          setShowSendDrawer(false);
        } else {
          toast.error("Failed to send email", {
            description: await response.text(),
          });
        }
      } catch (error) {
        toast.error(error.message || "Error sending email");
      }
    });
  };

  const handleEmailSelection = (emailId: string | null) => {
    if (emailId) {
      const selectedEmail = data?.list?.find((email) => email.id === emailId);
      if (selectedEmail && !selectedEmail.readAt) {
        handleMarkAsRead(emailId);
      }
    }
    onSelectEmail(emailId);
  };

  return (
    <div className={cn("grids flex flex-1 flex-col", className)}>
      <div className="flex items-center gap-2 bg-neutral-200/40 p-2 text-base font-semibold text-neutral-600 backdrop-blur dark:bg-neutral-800 dark:text-neutral-50">
        <Icons.mail size={20} />
        <span>INBOX</span>
        {data && data.total > 0 && (
          <Badge
            className="bg-neutral-200 px-2 py-0.5 text-xs dark:text-zinc-900"
            variant={"secondary"}
          >
            {data.total}
          </Badge>
        )}

        <div className="ml-auto flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            size={"sm"}
            onClick={() => handleOpenSendEmailModal()}
          >
            <Icons.send size={17} className={cn("")} />
          </Button>

          <TooltipProvider>
            <Tooltip delayDuration={200}>
              <TooltipTrigger>
                {/* 自定义开关图标 */}
                <Switch
                  className="mt-1 data-[state=checked]:bg-blue-500 data-[state=unchecked]:bg-neutral-300 dark:data-[state=unchecked]:bg-neutral-200"
                  onCheckedChange={(value) => handleSetAutoRefresh(value)}
                  defaultChecked={isAutoRefresh}
                  aria-label="Auto refresh"
                />
              </TooltipTrigger>
              <TooltipContent side="left">Auto refresh</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button
            variant="outline"
            size={"sm"}
            onClick={handleManualRefresh}
            disabled={isRefreshing || isLoading || isAutoRefresh}
          >
            <Icons.refreshCw
              size={15}
              className={cn(
                isRefreshing || isLoading || isAutoRefresh
                  ? "animate-spin"
                  : "",
              )}
            />
          </Button>
          <Button
            variant="outline"
            size={"sm"}
            onClick={() => setShowMutiCheckBox(!showMutiCheckBox)}
          >
            <Icons.listChecks className="size-4" />
          </Button>
          {selectedEmails.length > 0 && (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex w-full items-center gap-1"
                    disabled={isPending}
                  >
                    <span className="text-sm">more</span>
                    <Icons.chevronDown className="mt-0.5 size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleMarkSelectedAsRead}
                      className="w-full"
                      disabled={isPending}
                    >
                      <span className="text-xs">Mask as read</span>
                    </Button>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      // onClick={handleMarkSelectedAsRead}
                      className="w-full"
                      disabled={isPending}
                    >
                      <span className="text-xs">Delete selected</span>
                    </Button>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>
      {isLoading && (
        <div className="flex flex-col gap-2 p-2">
          <Skeleton className="h-[80px] w-full rounded-lg" />
          <Skeleton className="h-[80px] w-full rounded-lg" />
          <Skeleton className="h-[80px] w-full rounded-lg" />
          <Skeleton className="h-[80px] w-full rounded-lg" />
          <Skeleton className="h-[80px] w-full rounded-lg" />
          <Skeleton className="h-[80px] w-full rounded-lg" />
          <Skeleton className="h-[80px] w-full rounded-lg" />
          <Skeleton className="h-[80px] w-full rounded-lg" />
          <Skeleton className="h-[80px] w-full rounded-lg" />
        </div>
      )}
      {!isLoading && !error && (
        <div className="scrollbar-hidden relative h-[calc(100vh-105px)] animate-fade-in overflow-scroll">
          {selectedEmailId ? (
            <EmailDetail
              email={data?.list?.find((email) => email.id === selectedEmailId)}
              selectedEmailId={selectedEmailId}
              onClose={() => onSelectEmail(null)}
              onMarkAsRead={() => handleMarkAsRead(selectedEmailId)}
            />
          ) : (
            <>
              {data && data.total > 0 ? (
                data.list.map((email) => (
                  <div
                    key={email.id}
                    className="border-b border-dotted bg-neutral-100/50 px-3 py-2 hover:bg-gray-100 dark:border-neutral-700 dark:bg-neutral-900 hover:dark:bg-neutral-700"
                  >
                    <div className="flex items-center justify-between">
                      {showMutiCheckBox && (
                        <div
                          className="flex items-center gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            defaultChecked={selectedEmails.includes(email.id)}
                            onCheckedChange={() => handleSelectEmail(email.id)}
                            className="mr-2 size-4 border-neutral-300 bg-neutral-100 data-[state=checked]:border-neutral-900 data-[state=checked]:bg-neutral-600 data-[state=checked]:text-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:data-[state=checked]:border-neutral-300 dark:data-[state=checked]:bg-neutral-300"
                          />
                        </div>
                      )}
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => handleEmailSelection(email.id)}
                      >
                        <div className="mb-1 flex items-center justify-between">
                          <span className="w-3/4 truncate text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                            {email.fromName || email.subject || "Untitled"}
                          </span>
                          <span className="ml-auto text-xs text-neutral-600 dark:text-neutral-400">
                            {timeAgo((email.date as any) || email.createdAt)}
                          </span>
                          {email.readAt && (
                            <Icons.checkCheck className="ml-2 size-3 text-green-600" />
                          )}
                        </div>
                        <div className="mb-0.5 line-clamp-1 w-3/4 truncate text-xs font-medium text-neutral-600 dark:text-neutral-400">
                          {email.subject}
                        </div>
                        <div className="line-clamp-2 break-all text-xs text-neutral-500">
                          {email.html
                            ? htmlToText(email.html)
                            : email.text || "No content"}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex h-[calc(100vh-135px)] flex-col items-center justify-center gap-8">
                  <Loader />
                  <p className="font-mono font-semibold text-neutral-500">
                    Waiting for emails...
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {data && Math.ceil(data.total / pageSize) > 1 && (
        <PaginationWrapper
          className="mx-2 my-1 justify-center"
          total={Math.ceil(data.total / pageSize)}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
        />
      )}

      {/* 发送邮件 Modal */}
      <Drawer open={showSendDrawer} onOpenChange={setShowSendDrawer}>
        <DrawerContent className="fixed bottom-0 right-0 top-0 w-full rounded-none sm:max-w-xl">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-1">
              Send Email{" "}
              <Icons.help className="size-5 text-neutral-600 hover:text-neutral-400" />
            </DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" className="absolute right-4 top-4">
                <Icons.close className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </DrawerHeader>
          <div className="scrollbar-hidden h-[calc(100vh)] space-y-4 overflow-y-auto p-6">
            <div>
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                From
              </label>
              <Input value={emailAddress || ""} disabled className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                To
              </label>
              <Input
                value={sendForm.to}
                onChange={(e) =>
                  setSendForm({ ...sendForm, to: e.target.value })
                }
                placeholder="recipient@example.com"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Subject
              </label>
              <Input
                value={sendForm.subject}
                onChange={(e) =>
                  setSendForm({ ...sendForm, subject: e.target.value })
                }
                placeholder="Enter subject"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Content
              </label>
              <ReactQuill
                value={sendForm.html}
                onChange={(value) => setSendForm({ ...sendForm, html: value })}
                className="mt-1 h-40 rounded-lg"
                theme="snow"
                placeholder="Enter your message"
              />
            </div>
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline" disabled={isPending}>
                Cancel
              </Button>
            </DrawerClose>
            <Button
              onClick={handleSendEmail}
              disabled={isPending}
              variant={"default"}
            >
              {isPending ? "Sending..." : "Send"}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
