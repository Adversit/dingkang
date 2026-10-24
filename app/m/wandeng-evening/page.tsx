import Page from "@/modules/wandeng-evening/app/page";
import ModuleStorageGate from "@/components/ModuleStorageGate";
import "@/modules/wandeng-evening/app/globals.css";
export const dynamic="force-dynamic";
export default function EveningPage(){return <ModuleStorageGate moduleId="wandeng-evening"><Page/></ModuleStorageGate>;}
