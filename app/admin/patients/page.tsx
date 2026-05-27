import { format } from "date-fns";

import { db } from "@/lib/db";

import { LeadCloumn } from "./components/column";
import { BillboardClient } from "./components/client";

export const dynamic = "force-dynamic";

const BillboardsPage = async ({ params }: { params: { storeId: string } }) => {
  let billboards: any[] = [];
  try {
    // Cap at 200 most recent patients. The page renders this as a client-side
    // DataGrid that filters/searches in JS — loading 5000+ rows freezes the
    // browser for several seconds AND has no UI to scroll past the visible
    // window anyway. A real paginated UI is a follow-up; for now this cuts
    // the server query + initial JSON payload by ~95%.
    billboards = await db.lead.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  } catch {
    billboards = [];
  }

 

  const formattedLeadCloumn: LeadCloumn[] = billboards.map((item) => ({
    id: item.id,
    name: item.name,
    dood: item.dood ? format(new Date(item.dood), "dd/MM/yyyy") : null,
    doad: item.doad ? format(new Date(item.doad), "dd/MM/yyyy") : null,
    gender: item.gender,
    dx: item.dx || null,
    surgery: item.surgery || null,
    side: item.side || null,
    remark: item.remark || null,
    phone: item.phone || null,
    address: item.address || null,
    age: item.age || null,
    ipdReg: item.ipdReg || null,
    bill: item.bill || null,
    implant: item.implant || null,
    patientStatus: item.patientStatus || null,
    tpa: item.tpa,
    city: item.cities,
    hospital: item.hospital || null
  }));

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <BillboardClient data={formattedLeadCloumn} />
      </div>
    </div>
  );
};

export default BillboardsPage;
