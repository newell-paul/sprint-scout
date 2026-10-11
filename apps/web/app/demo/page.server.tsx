import { getPlannerData } from "@scout/application";
import { defaultPlannerRequest } from "@scout/contracts";
import { DemoBanner } from "@scout/ui";
import Planner from "../components/planner";
export default async function Home() {
  return (
    <>
      <DemoBanner />
      <Planner initial={await getPlannerData(defaultPlannerRequest)} />
    </>
  );
}
