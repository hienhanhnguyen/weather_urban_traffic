import { conditionFor } from "./wmo";

export function WeatherIcon({
  code,
  isDay = true,
  className,
}: {
  code: number | null;
  isDay?: boolean;
  className?: string;
}) {
  const condition = conditionFor(code);
  const Icon = isDay ? condition.icon : (condition.nightIcon ?? condition.icon);

  return <Icon aria-hidden="true" className={className} />;
}
