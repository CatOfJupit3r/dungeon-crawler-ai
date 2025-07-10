import Header from "@dungeon-crawler-ai:web/components/header";
import {
    HeadContent,
    Outlet,
    createRootRouteWithContext,
    useRouterState,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import "../index.css";

export interface RouterAppContext {}

export const Route = createRootRouteWithContext<RouterAppContext>()({
    component: RootComponent,
    head: () => ({
        meta: [
            {
                title: "My App",
            },
            {
                name: "description",
                content: "My App is a web application",
            },
        ],
        links: [
            {
                rel: "icon",
                href: "/favicon.ico",
            },
        ],
    }),
});

function RootComponent() {
    const isFetching = useRouterState({
        select: (s) => s.isLoading,
    });

    return (
        <>
            <HeadContent />
            <div className="grid grid-rows-[auto_1fr] h-svh">
                <Header />
                {isFetching ? <div>Loading...</div> : <Outlet />}
                {/* {isFetching ? <Loader /> : <Outlet />} */}
            </div>
            <TanStackRouterDevtools position="bottom-left" />
        </>
    );
}
