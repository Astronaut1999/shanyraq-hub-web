import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/orgs")({
  component: OrganizationsLayout,
});

function OrganizationsLayout() {
  return <Outlet />;
}