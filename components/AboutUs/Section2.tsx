import React from "react";
import Navbar from "../Navbar/navbar";
import Image from "next/image";

type Props = {};

const Section2 = (props: Props) => {
  return (
    <>
      <Navbar />
      <section className="flex items-center bg-stone-100  font-poppins dark:bg-inherit ">
        <div className="justify-center flex-1 max-w-[90%] py-4 mx-auto lg:py-6 md:px-6">
          <div className="flex flex-wrap ">
            <div className="w-full px-4 mx-auto mb-10 lg:w-1/3 lg:mb-0">
              <span className="text-lg font-semibold text-primary uppercase">
                Who we are
              </span>
              <h2 className="mt-2 mb-6 text-2xl md:text-5xl font-bold dark:text-gray-300">
                Quick Introduction about{" "}
                <span className="text-primary">Dr Dheeraj Dubay</span>
              </h2>
              <p className="max-w-3xl mt-3 text-xl lg:text-3xl leading-relaxed text-gray-600 dark:text-gray-200 md:mt-8">
                Sr. Consultant Joint Replacement Surgery - Shalby
                Multi-Specialty Hospitals Jaipur
              </p>
              <li className="mx-1 font-semibold text-xl text-gray-600 my-4">
                MBBS, MS (Orthopedic), FJRS (Germany)
              </li>
              <p className="mb-10 md:text-lg text-gray-600 dark:text-gray-400 ">
                He has completed his fellowship from Aklepios Ortho Center,
                Germany in complex and revision joint replacement surgeries. He
                has more than 15 years of experience in the field of Joint
                Replacement Surgeries and is well wersed with latest techniques
                such as computer navigation and minimally invasive surgeries.
                Now he is performing replacement surgeries at Shalby
                Multi-Specialty Hospital, Jaipur. He has done more than 18000
                successful Joint Replacement Surgeries. Record of 17 joint
                replacement surgeries in a day in Rajasthan.
              </p>
            </div>
            <div className="w-full px-4 mb-10 lg:w-1/2 lg:mb-0">
              <div className="relative">
                <Image
                  width={1200}
                  height={1200}
                  src={"/assets/images/hero2.JPG"}
                  alt="aboutimage"
                  className="relative z-10 object-cover w-full h-full rounded"
                />
                <div className="absolute bottom-0 right-0 z-10 p-4 bg-white shadow sm:p-8 dark:text-gray-300 dark:bg-gray-800 ">
                  <p className="text-lg font-semibold">
                    15 Years of Experience in the joint replacement surgery
                  </p>
                </div>
                <div className="absolute hidden w-full h-full bg-primary rounded -bottom-6 left-6 lg:block"></div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Section2;
