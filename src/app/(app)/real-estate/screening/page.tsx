import { RealEstateGate } from "@/components/real-estate-screening/RealEstateGate";
import { RealEstateEntry } from "@/components/real-estate-screening/RealEstateEntry";

export default function RealEstateScreeningPage() {
  return (
    <RealEstateGate>
      <RealEstateEntry />
    </RealEstateGate>
  );
}
