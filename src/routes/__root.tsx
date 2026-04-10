import {
  ClerkProvider,
  Show,
  SignInButton,
  UserButton,
} from "@clerk/tanstack-react-start";
import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";

import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
import TanStackQueryProvider from "../integrations/tanstack-query/root-provider";
import { getAuthState } from "../lib/auth";

import appCss from "../styles.css?url";

interface MyRouterContext {
  queryClient: QueryClient;
  userId: string | null;
}

/**/
const RootDocument = ({ children }: { children: React.ReactNode }) => (
  <html lang="en" suppressHydrationWarning>
    <head>
      <HeadContent />
    </head>
    <body className="font-sans antialiased [overflow-wrap:anywhere] selection:bg-[var(--primary)] selection:text-primary-foreground mx-16 my-12">
      <TanStackQueryProvider>
        <ClerkProvider>
          <header className="flex items-center justify-between mb-8">
            <h1 className="text-xl font-bold">Realtalk</h1>
            <div className="flex items-center gap-4">
              <Show when="signed-out">
                <SignInButton mode="modal" />
              </Show>
              <Show when="signed-in">
                <UserButton />
              </Show>
            </div>
          </header>
          {children}
        </ClerkProvider>
        <TanStackDevtools
          config={{
            position: "bottom-right",
          }}
          plugins={[
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
            TanStackQueryDevtools,
          ]}
        />
      </TanStackQueryProvider>
      <Scripts />
    </body>
  </html>
);
/**/

export const Route = createRootRouteWithContext<MyRouterContext>()({
  beforeLoad: async () => {
    const { userId } = await getAuthState();
    return { userId };
  },
  head: () => ({
    links: [
      {
        href: appCss,
        rel: "stylesheet",
      },
    ],
    meta: [
      {
        charSet: "utf8",
      },
      {
        content: "width=device-width, initial-scale=1",
        name: "viewport",
      },
      {
        title: "Realtalk | Learn languages",
      },
    ],
  }),
  shellComponent: RootDocument,
});
