"use client";

import React, { Dispatch, SetStateAction, useEffect, useState } from "react";

import ReactCalendar from "react-calendar";

import "./Calendar.css";

import { format, formatISO, isBefore, parse, set } from "date-fns";
import {
  CLOSING_TIME,
  INTERVAL,
  OPENING_HOURS_INTERVAL,
  OPENING_TIME,
  now,
} from "./Constants/config";
import { useRouter } from "next/navigation";
import { getOpeningTimes, roundToNearestMinutes } from "@/utils/helper";
import { Day } from "@prisma/client";
import { useModal } from "@/hooks/use-modal-store";
import qs from "query-string";

type DateTime = {
  justDate: Date | null;
  dateTime: Date | null;
};

interface CalendarProps {
  days: Day[];
  closedDays: { id: string; date: Date }[];
  appointments: any;
  city: string;
}

const Calendar = ({ days, closedDays, appointments, city }: CalendarProps) => {
  const router = useRouter();


  // console.log("the days sent to props in the calendar are ", days);
  // Determine if today is closed
  const today = days.find((d) => d.dayOfWeek === now.getDay());
  const rounded = roundToNearestMinutes(now, OPENING_HOURS_INTERVAL);
  const closing = parse(today!.closeTime, "kk:mm", now);
  const tooLate = !isBefore(rounded, closing);
  
  // if (tooLate) closedDays.push(formatISO(new Date().setHours(0, 0, 0, 0)));

  const [date, setDate] = useState<DateTime>({
    justDate: null,
    dateTime: null,
  });


    let times =  date?.justDate && getOpeningTimes(date.justDate, days);

    const [filteredTimes, setFilteredTimes] = useState<Date[] | null>(null);
   
    
    console.log("the times are ", times);

    const handleClick = async(event: any) => {
      
      console.log("hello" ,event);
      times =  event && getOpeningTimes(event, days);
      console.log("the date is ", times);
      if (times) {
      console.log(date.justDate);
      const formattedDate = format(event, "dd-MM-yyyy").toString();
      console.log("the formatted date is ", formattedDate.toString());

      const exists = appointments.some((appointment: any) => appointment.date === formattedDate)

      console.log("the exists is ", exists);  

      if(exists){
        appointments = appointments.filter((appointment: any) => appointment.date === formattedDate);

      times.forEach(time => {
           console.log("the times are", format(time, "hh:mm aaa")); 
      });
      
      
   

    times = times.filter((time) => {
    // Check if any appointment matches the current time
    //@ts-ignore
    return !appointments.some((appointment) => {
        return appointment.time === format(time, "hh:mm aaa").toString();
    });
});
    
    setFilteredTimes(times)
    
    

    




      }

      else{
        setFilteredTimes(times);
      }

      


    }
    }
      console.log("the appointments time are ", appointments);
    

        ;


    
    
    

  useEffect(() => {
    if (date.dateTime) {


      const formattedDate = format(date.dateTime, "dd-MM-yyyy");

      
      const formattedTime = format(date.dateTime, "hh:mm aaa");
       
      const booking = qs.stringifyUrl({
        url: "/booking/booking-form",
        query: {
          date: formattedDate,
          time: formattedTime,
          city
        },
      });
      router.push(booking);
    }
  }, [date.dateTime, router, city]);

  // console.log("the just date is ", date.justDate);

  


  function isToday(inputDate: Date) {
    const today = new Date();
    return (
      inputDate.getDate() === today.getDate() &&
      inputDate.getMonth() === today.getMonth() &&
      inputDate.getFullYear() === today.getFullYear()
    );
  }

  return (
    <div className="flex  flex-col justify-center items-center dark:text-gray-800">
      {date.justDate ? (
        <div>
          <h1 className="font-medium text-xl m-4 italic">
            Please Select your Desired Time {"-> "}
          </h1>
          <div className="flex flex-wrap gap-4">
            {filteredTimes?.map((time, i) => (
              <div key={`time-${i}`} className="rounded-sm bg-gray-100 p-2 ">
                <button
                  type="button"
                  onClick={() =>
                    setDate((prev) => ({ ...prev, dateTime: time }))
                  }
                >
                  {format(time, "hh: mm aaa")}
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <ReactCalendar
          minDate={now}
          className="REACT-CALENDAR p-2"
          view="month"
          tileDisabled={({ date, view }) =>
            (view === "month" &&
              closedDays.some(
                (closedDay) =>
                  date.getFullYear() === closedDay.date.getFullYear() &&
                  date.getMonth() === closedDay.date.getMonth() &&
                  date.getDate() === closedDay.date.getDate()
              )) ||
            isToday(date)
          }
          onClickDay={(date) => {
            setDate((prev) => ({ ...prev, justDate: date }));
            handleClick(date);
          }
        }
            
          
        />
      )}
    </div>
  );
};

export default Calendar;
