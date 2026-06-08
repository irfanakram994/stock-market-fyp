import RoleLoginPage from "@/components/RoleLoginPage";

export default function SuperAdminLoginPage() {
  return (
    <RoleLoginPage
      expectedRole="super_admin"
      title="Super Admin Login"
      subtitle="Access global TradeFlux controls"
      targetPath="/super-admin"
      accentClass="bg-fuchsia-500/15 text-fuchsia-300"
      buttonClass="bg-fuchsia-600 hover:bg-fuchsia-500"
    />
  );
}
