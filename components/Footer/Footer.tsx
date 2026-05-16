import Link from "next/link";
import React from "react";

import { YoutubeIcon, FacebookIcon, InstagramIcon } from "lucide-react";
import Image from "next/image";
import { getWhatsAppBookingUrl } from "@/lib/whatsapp-booking";

type Props = {};

const Footer = (props: Props) => {
  return (
    <div>
      <div className="dark:bg-gray-800 bg-[#E2FFF5] py-4 dark:text-gray-400 ">
        <div className="container px-4 mx-auto">
          <div className="-mx-4 flex flex-wrap justify-between">
            <div className="px-4 my-4 w-full xl:w-1/5">
              <Link href="/" className="block w-44 mb-6">
                <Image
                  height={600}
                  width={600}
                  src={"/assets/images/logofinalbg.png"}
                  alt={"logo"}
                />
              </Link>
              <p className="text-justify font-extrabold  text-gray-600">
                Dr. Dheeraj is one of the leading joint replacement surgeons in
                North India.
              </p>
            </div>

            <div className="px-4 my-4 w-full sm:w-auto">
              <div>
                <h2 className="inline-block text-2xl pb-4 mb-4 border-b-4 border-primary font-bold text-gray-700">
                  Quick Links
                </h2>
              </div>
              <ul className="leading-8">
                <li>
                  <a
                    href={getWhatsAppBookingUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary"
                  >
                    Book Appointment
                  </a>
                </li>
                <li>
                  <Link href="/about" className="hover:text-primary">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-primary">
                    Contact Us
                  </Link>
                </li>
              </ul>
            </div>
            <div className="px-4 my-4 w-full sm:w-auto">
              <div>
                <h2 className="inline-block text-2xl pb-4 mb-4 border-b-4 border-primary font-bold text-gray-700">
                  Quick Links
                </h2>
              </div>
              <ul className="leading-8">
                <li>
                  <Link href="/#services" className="hover:text-primary">
                    Services
                  </Link>
                </li>
                <li>
                  <Link href="/gallery" className="hover:text-primary">
                    Gallery
                  </Link>
                </li>
                <li>
                  <Link href="/youtube" className="hover:text-primary">
                    Youtube
                  </Link>
                </li>
              </ul>
            </div>

            <div className="px-4 my-4 w-full sm:w-auto xl:w-1/5">
              <div>
                <h2 className="inline-block text-2xl pb-4 mb-4 border-b-4 border-primary font-bold text-gray-700">
                  Connect With Us
                </h2>
              </div>
              <Link
                href="https://www.facebook.com/drdheerajdubay/"
                className="inline-flex items-center justify-center h-8 w-8 border border-gray-100 rounded-full mr-1 hover:text-primary hover:border-blue-400"
              >
                <FacebookIcon />
              </Link>

              <Link
                href="https://www.instagram.com/dheerajdubay1/?igshid=YmMyMTA2M2Y%3D"
                className="inline-flex items-center justify-center h-8 w-8 border border-gray-100 rounded-full mr-1 hover:text-primary hover:border-blue-400"
              >
                <InstagramIcon />
              </Link>
              <Link
                href=" https://www.youtube.com/@dr.dheerajdubay6664"
                className="inline-flex items-center justify-center h-8 w-8 border border-gray-100 rounded-full mr-1 mt-2 hover:text-primary hover:border-blue-400"
              >
                <YoutubeIcon />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Footer;
