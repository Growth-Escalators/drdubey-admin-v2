import React, { useState } from "react";

import CallIcon from "@mui/icons-material/Call";
import Person4Icon from "@mui/icons-material/Person4";
import InstagramIcon from "@mui/icons-material/Instagram";
import YouTubeIcon from "@mui/icons-material/YouTube";
import TwitterIcon from "@mui/icons-material/Twitter";
import FacebookIcon from "@mui/icons-material/Facebook";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";
import { useModal } from "@/hooks/use-modal-store";
import { getWhatsAppBookingUrl } from "@/lib/whatsapp-booking";

type Props = {};

const Booknow = (props: Props) => {
  const router = useRouter();
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const { onOpen } = useModal();

  const handleNavigateToBooking = () => {
    if (selectedCity) {
      router.push(`/booking/${encodeURIComponent(selectedCity)}`);
    }
  };
  return (
    <div className=" my-16">
      <div className="bg-[#E2FFF5] dark:bg-inherit p-10 flex flex-col items-center">
        <h1 className="text-xl text-primary font-semibold">BOOK NOW</h1>
        <h1 className="text-4xl md:text-5xl font-bold mt-2 text-gray-700 dark:text-gray-200 text-center">
          Book your medical appointment Today
        </h1>
        <div className="mt-8 flex flex-col lg:flex-row text-2xl font-semibold">
          {/* <div className="">
            <Button onClick={() => onOpen("selectCity")} className="border bg-transparent dark:bg-[#B9F7CD] text-black border-black px-12 py-4 m-2 flex items-center">
                <Person4Icon className="mx-2" />
            Book an appointment
            </Button>
          </div>
          <Link
            className=""
            href={"/booking"}
          >
           
          </Link> */}
          <a
            className="p-2 border rounded relative inline-flex justify-center items-center gap-x-3 text-center bg-primary hover:bg-blue-700 border border-primary text-sm lg:text-base text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-white transition py-3 px-4 dark:focus:ring-offset-gray-800"
            href={getWhatsAppBookingUrl()}
            target="_blank"
            rel="noopener noreferrer"
          >
            Book an appoinment
          </a>
        </div>
      </div>
    </div>
  );
};

export default Booknow;
