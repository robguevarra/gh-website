"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface DateRangePickerProps {
  startDate?: string;
  endDate?: string;
}

export default function DateRangePicker({ startDate, endDate }: DateRangePickerProps) {
  const router = useRouter();
  
  // Parse initial dates or use defaults
  const initialStartDate = startDate ? new Date(startDate) : getDefaultStartDate();
  const initialEndDate = endDate ? new Date(endDate) : new Date();
  
  const [start, setStart] = useState<Date | undefined>(initialStartDate);
  const [end, setEnd] = useState<Date | undefined>(initialEndDate);
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [isEndOpen, setIsEndOpen] = useState(false);

  function getDefaultStartDate() {
    const date = new Date();
    date.setDate(date.getDate() - 30); // Default to 30 days ago
    return date;
  }

  function handleApply() {
    if (!start || !end) return;
    
    const startStr = format(start, "yyyy-MM-dd");
    const endStr = format(end, "yyyy-MM-dd");
    
    // Navigate to the page with query params
    router.push(`/admin/affiliates/analytics?startDate=${startStr}&endDate=${endStr}`);
  }

  function handleReset() {
    const defaultStart = getDefaultStartDate();
    setStart(defaultStart);
    setEnd(new Date());
    
    // Navigate to the page without query params
    router.push('/admin/affiliates/analytics');
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-end justify-end mb-6">
      <div className="flex gap-3">
        <div>
          <span className="text-sm text-muted-foreground block mb-2">Start Date</span>
          <Popover open={isStartOpen} onOpenChange={setIsStartOpen}>
            <PopoverTrigger asChild>
              <Button
                id="startDate"
                variant={"outline"}
                className={cn(
                  "w-[150px] justify-start text-left font-normal",
                  !start && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {start ? format(start, "MMMM dd, yyyy") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={start}
                onSelect={(date) => {
                  setStart(date);
                  setIsStartOpen(false);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <span className="text-sm text-muted-foreground block mb-2">End Date</span>
          <Popover open={isEndOpen} onOpenChange={setIsEndOpen}>
            <PopoverTrigger asChild>
              <Button
                id="endDate"
                variant={"outline"}
                className={cn(
                  "w-[150px] justify-start text-left font-normal",
                  !end && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {end ? format(end, "MMMM dd, yyyy") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={end}
                onSelect={(date) => {
                  setEnd(date);
                  setIsEndOpen(false);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="secondary" onClick={handleReset}>
          Reset
        </Button>
        <Button variant="default" onClick={handleApply}>
          Apply Filter
        </Button>
      </div>
    </div>
  );
}
