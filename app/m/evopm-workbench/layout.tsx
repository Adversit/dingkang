import "@/modules/evopm-workbench/app/styles.css";
export const metadata = {title: "EvoPM · 产品演进工作台", icons: {icon: "/assets/evopm-workbench/favicon.svg"}};
export default function Layout({children}: {children: React.ReactNode}) { return <div className="evopm-module">{children}</div>; }
