import { Temporal } from "@js-temporal/polyfill";
import { forecastWindow, utcInstant } from "@scout/contracts";
export class TimeResolutionError extends Error {
  constructor(
    readonly code:
      | "INVALID_LOCAL_TIME"
      | "NONEXISTENT_LOCAL_TIME"
      | "AMBIGUOUS_LOCAL_TIME"
      | "INVALID_WINDOW",
  ) {
    super(code);
  }
}
export type FoldChoice = "earlier" | "later";
export function resolveLocalInstant(
  date: string,
  time: string,
  timeZone: string,
  choice?: FoldChoice,
): string {
  if (
    !/^\d{4}-\d\d-\d\d$/.test(date) ||
    !/^\d\d:\d\d$/.test(time) ||
    /^[+-]/.test(timeZone) ||
    (choice !== undefined && choice !== "earlier" && choice !== "later")
  )
    throw new TimeResolutionError("INVALID_LOCAL_TIME");
  try {
    const local = Temporal.PlainDateTime.from(`${date}T${time}:00`, {
      overflow: "reject",
    });
    const earlier = local.toZonedDateTime(timeZone, {
      disambiguation: "earlier",
    });
    const later = local.toZonedDateTime(timeZone, { disambiguation: "later" });
    if (
      !earlier.toPlainDateTime().equals(local) ||
      !later.toPlainDateTime().equals(local)
    )
      throw new TimeResolutionError("NONEXISTENT_LOCAL_TIME");
    if (
      earlier.epochNanoseconds !== later.epochNanoseconds &&
      choice === undefined
    )
      throw new TimeResolutionError("AMBIGUOUS_LOCAL_TIME");
    return (choice === "later" ? later : earlier)
      .toInstant()
      .toString({ smallestUnit: "second" });
  } catch (e) {
    if (e instanceof TimeResolutionError) throw e;
    throw new TimeResolutionError("INVALID_LOCAL_TIME");
  }
}
export function resolveLocalWindow(input: {
  date: string;
  startTime: string;
  endTime: string;
  timeZone: string;
  startChoice?: FoldChoice;
  endChoice?: FoldChoice;
}) {
  if (input.startTime === input.endTime)
    throw new TimeResolutionError("INVALID_WINDOW");
  const startAt = resolveLocalInstant(
    input.date,
    input.startTime,
    input.timeZone,
    input.startChoice,
  );
  let endDate = input.date;
  if (input.endTime < input.startTime)
    endDate = Temporal.PlainDate.from(input.date).add({ days: 1 }).toString();
  const endAt = resolveLocalInstant(
    endDate,
    input.endTime,
    input.timeZone,
    input.endChoice,
  );
  const parsed = forecastWindow.safeParse({ startAt, endAt });
  if (!parsed.success) throw new TimeResolutionError("INVALID_WINDOW");
  return { ...parsed.data, timeZone: input.timeZone };
}
export function resolveRelativeDate(
  day: "today" | "tomorrow",
  timeZone: string,
  now: string,
): string {
  utcInstant.parse(now);
  if (day !== "today" && day !== "tomorrow")
    throw new TimeResolutionError("INVALID_LOCAL_TIME");
  try {
    return Temporal.Instant.from(now)
      .toZonedDateTimeISO(timeZone)
      .toPlainDate()
      .add({ days: day === "tomorrow" ? 1 : 0 })
      .toString();
  } catch {
    throw new TimeResolutionError("INVALID_LOCAL_TIME");
  }
}
export function formatLocalInstant(instant: string, timeZone: string): string {
  utcInstant.parse(instant);
  return Temporal.Instant.from(instant)
    .toZonedDateTimeISO(timeZone)
    .toString({ smallestUnit: "minute" });
}
