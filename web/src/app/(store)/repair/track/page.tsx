import type { Metadata } from "next";
import { PageHero } from "@/components/layout/PageHero";
import { TrackRepair } from "@/components/repair/TrackRepair";

export const metadata: Metadata = {
  title: "Track a Repair",
  description: "Check the status of your PB Repairing Lab repair with your reference and phone number.",
};

export default async function TrackPage(props: PageProps<"/repair/track">) {
  const { ref } = await props.searchParams;
  return (
    <>
      <PageHero eyebrow="Repair status" title="Track your" accent="repair." intro="Enter the reference from your visit note (e.g. PBR-1042) and the mobile number you booked with." />
      <section className="container-pb pb-24">
        <TrackRepair initialRef={typeof ref === "string" ? ref : ""} />
      </section>
    </>
  );
}
