import logoLight from "@/assets/logo-light.png";
import logoDark from "@/assets/logo-dark.png";

type Props = {
  size?: number;
  showText?: boolean;
  className?: string;
  textClassName?: string;
};

export function Logo({ size = 32, showText = true, className = "", textClassName = "" }: Props) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img
        src={logoLight}
        alt="Total Reward"
        width={size}
        height={size}
        className="block dark:hidden rounded-md shrink-0"
        style={{ width: size, height: size }}
      />
      <img
        src={logoDark}
        alt="Total Reward"
        width={size}
        height={size}
        className="hidden dark:block rounded-md shrink-0"
        style={{ width: size, height: size }}
      />
      {showText && (
        <span
          className={`font-extrabold tracking-tight text-foreground ${textClassName}`}
          style={{ fontFamily: '"Montserrat", ui-sans-serif, system-ui, sans-serif', fontWeight: 800 }}
        >
          Total Reward
        </span>
      )}
    </div>
  );
}
