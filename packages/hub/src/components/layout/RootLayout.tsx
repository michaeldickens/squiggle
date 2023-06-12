import { FC, PropsWithChildren } from "react";

import { useSession } from "next-auth/react";
import Link from "next/link";

import { newDefinitionRoute, newModelRoute } from "@/routes";
import { UserControls } from "./UserControls";

const MenuLink: FC<PropsWithChildren<{ href: string }>> = ({
  href,
  children,
}) => (
  <Link className="text-sm text-gray-300 hover:text-white" href={href}>
    {children}
  </Link>
);

const TopMenu: FC = () => {
  const { data: session } = useSession();

  return (
    <div className="border-slate-200 h-12 flex items-center justify-between px-4 bg-gray-800">
      <div className="flex gap-6 items-baseline">
        {" "}
        <Link className="text-md py-2 text-white" href="/">
          Squiggle Hub
        </Link>
        {session ? (
          <>
            <MenuLink href={newModelRoute()}>New model</MenuLink>
            <MenuLink href={newDefinitionRoute()}>New definition</MenuLink>
          </>
        ) : null}
      </div>
      <UserControls session={session} />
    </div>
  );
};

export const RootLayout: FC<PropsWithChildren> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1">
        <TopMenu />
        <div>{children}</div>
      </div>
      <div className="p-8 border-t border-t-slate-200 bg-slate-100">
        <div className="text-sm text-slate-500">
          By{" "}
          <a
            href="https://quantifieduncertainty.org"
            className="text-blue-500 hover:underline"
          >
            QURI
          </a>
        </div>
      </div>
    </div>
  );
};
