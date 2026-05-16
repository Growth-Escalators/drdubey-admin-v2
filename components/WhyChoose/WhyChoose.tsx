import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "../ui/button";
import { useModal } from "@/hooks/use-modal-store";
import { getWhatsAppBookingUrl } from "@/lib/whatsapp-booking";

type Props = {};

const WhyChoose = (props: Props) => {
  const router = useRouter();
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  const { onOpen } = useModal();

  const handleCitySelect = (city: string) => {
    setSelectedCity(city);
    router.push(`/booking/${city}`);
    setShowCityDropdown(false);
  };

  // const handleBookAppointment = () => {
  //   setShowCityDropdown(true);
  // };

  const handleNavigateToBooking = () => {
    if (selectedCity) {
      router.push(`/booking/${encodeURIComponent(selectedCity)}`);
    }
  };
  return (
    <div className="w-[80%]  mx-auto my-16 md:my-32">
      <div className="flex flex-col md:flex-row items-center justify-center md:space-x-56">
        <div data-aos="slide-right" className=" mx-auto md:w-[70%]">
          <Image
            width={900}
            height={900}
            src="/assets/images/whycoose2.jpg"
            alt="#"
            className="rounded-xl"
          />
        </div>

        <div data-aos="slide-left" className="md:w-1/2  ">
          <h1 className="text-2xl md:text-5xl font-semibold text-primary my-8">
            Why Choose Us?
          </h1>
          <ul className="list-disc list-inside mt-4 text-xl md:text-2xl">
            <li className="flex items-center my-2">
              <CheckCircleIcon className="mr-2 " color="primary" />
              Safety First Quality Must
            </li>
            <li className="flex items-center my-2">
              <CheckCircleIcon className="mr-2" color="primary" />
              Patient-Centric Approach
            </li>
            <li className="flex items-center my-2">
              <CheckCircleIcon className="mr-2" color="primary" />
              Focused Leadership
            </li>
            <li className="flex items-center my-2">
              <CheckCircleIcon className="mr-2" color="primary" />
              Cutting-Edge Technology
            </li>
            <li className="flex items-center my-2">
              <CheckCircleIcon className="mr-2" color="primary" />
              Transparent Pricing
            </li>
            <li className="flex items-center my-2">
              <CheckCircleIcon className="mr-2" color="primary" />
              Coordinated Care
            </li>
          </ul>
        </div>
      </div>
      <div className="my-[80px] ">
        <h1 className="text-4xl md:text-5xl font-semibold">
          <span className=" text-primary">|</span> Wellness{" "}
          <span className=" text-primary">|</span> Compassion{" "}
          <span className=" text-primary">|</span> Quality{" "}
          <span className=" text-primary">|</span>
        </h1>
        <p className="my-4 text-lg md:text-2xl">
          We provide you the best quality at the most affordable price . Book an
          appointment now and visit any of our 5 centers.
        </p>
        <div className="">
          {/* <Button
            onClick={() => onOpen("selectCity")}
            className="p-2 border  relative inline-flex justify-center items-center gap-x-3 text-center bg-primary hover:bg-blue-700  border-primary text-sm lg:text-base text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-white transition py-3 px-4 dark:focus:ring-offset-gray-800"
          >
            Book an appointment
          </Button> */}
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

export default WhyChoose;
