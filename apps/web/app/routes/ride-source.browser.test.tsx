import { expect, it, vi } from "vitest";
import { render } from "vitest-browser-react/pure";
import RideSource, { type Ride } from "./ride-source";

const gpx = (points: [number, number][]) =>
  `<?xml version="1.0"?><gpx version="1.1"><trk><trkseg>${points
    .map(
      ([lon, lat], i) =>
        `<trkpt lat="${lat}" lon="${lon}"><time>2026-10-28T09:00:${String(i).padStart(2, "0")}Z</time></trkpt>`,
    )
    .join("")}</trkseg></trk></gpx>`;
const file = (text: string, name = "ride.gpx") =>
  new File([text], name, { type: "application/gpx+xml" });
const north: [number, number][] = [
  [-0.12, 51.5],
  [-0.12, 51.501],
  [-0.12, 51.502],
  [-0.12, 51.503],
];
const ride: Ride = {
  track: north,
  along: [0, 111.2, 222.4, 333.6],
  fileName: "ride.gpx",
};
const props = () => ({
  ride: null as Ride | null,
  start: null as number | null,
  finish: null as number | null,
  onOpen: vi.fn(),
  onPick: vi.fn(),
  onClose: vi.fn(),
});

it("keeps the file input disabled until the own-recording tick", async () => {
  const screen = await render(<RideSource {...props()} />);
  await screen.getByText("From a ride").click();

  await expect.element(screen.getByLabelText("Open GPX ride")).toBeDisabled();
  await screen
    .getByRole("checkbox", { name: /my own device recording/ })
    .click();
  await expect.element(screen.getByLabelText("Open GPX ride")).toBeEnabled();
});

it("opens a ride as lon, lat points with distance along it", async () => {
  const p = props();
  const screen = await render(<RideSource {...p} />);
  await screen.getByText("From a ride").click();
  await screen
    .getByRole("checkbox", { name: /my own device recording/ })
    .click();

  await screen.getByLabelText("Open GPX ride").upload(file(gpx(north)));

  await expect.poll(() => p.onOpen.mock.calls.length).toBe(1);
  const opened = p.onOpen.mock.calls[0]![0] as Ride;
  expect(opened.track).toEqual(north);
  expect(opened.along[3]).toBeCloseTo(333.6, 0);
  expect(opened.fileName).toBe("ride.gpx");
  await expect
    .element(screen.getByRole("status"))
    .toHaveTextContent("ride.gpx is open. It is read in this browser only");
});

it("says why a file can't be read and opens nothing", async () => {
  const p = props();
  const screen = await render(<RideSource {...p} ride={ride} />);
  await screen.getByText("From a ride").click();
  await screen
    .getByRole("checkbox", { name: /my own device recording/ })
    .click();

  await screen
    .getByLabelText("Open GPX ride")
    .upload(file("<gpx></gpx>", "empty.gpx"));

  await expect
    .element(screen.getByRole("status"))
    .toHaveTextContent("GPX file contains no track points.");
  expect(p.onOpen).not.toHaveBeenCalled();
  await expect
    .element(screen.getByRole("slider", { name: "Segment start" }))
    .toBeVisible();
});

it("picks with the sliders and keeps the start before the finish", async () => {
  const p = props();
  const screen = await render(
    <RideSource {...p} ride={ride} start={1} finish={2} />,
  );
  await screen.getByText("From a ride").click();

  const start = screen.getByRole("slider", { name: "Segment start" });
  const finish = screen.getByRole("slider", { name: "Segment finish" });
  await expect.element(start).toHaveAttribute("aria-valuetext", "0.11 km");
  await expect.element(finish).toHaveAttribute("aria-valuetext", "0.22 km");

  await start.fill("3");
  expect(p.onPick).toHaveBeenLastCalledWith(1, 2);
  await finish.fill("0");
  expect(p.onPick).toHaveBeenLastCalledWith(1, 2);
  await finish.fill("3");
  expect(p.onPick).toHaveBeenLastCalledWith(1, 3);
});

it("shows the whole ride on the sliders before anything is picked", async () => {
  const p = props();
  const screen = await render(<RideSource {...p} ride={ride} />);
  await screen.getByText("From a ride").click();

  await expect
    .element(screen.getByRole("slider", { name: "Segment start" }))
    .toHaveAttribute("aria-valuetext", "0.00 km");
  await expect
    .element(screen.getByRole("slider", { name: "Segment finish" }))
    .toHaveAttribute("aria-valuetext", "0.33 km");
});

it("closes the ride", async () => {
  const p = props();
  const screen = await render(<RideSource {...p} ride={ride} />);
  await screen.getByText("From a ride").click();

  await screen.getByRole("button", { name: "Close ride" }).click();

  expect(p.onClose).toHaveBeenCalledOnce();
});
