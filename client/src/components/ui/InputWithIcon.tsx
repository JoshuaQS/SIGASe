import React from "react";
import { Input, type InputProps } from "@/components/ui/input";

interface InputWithIconProps extends Omit<InputProps, "startAdornment"> {
  icon: React.ReactNode;
}

export const InputWithIcon = React.forwardRef<HTMLInputElement, InputWithIconProps>(
  ({ icon, className, ...props }, ref) => {
    return <Input ref={ref} className={className} startAdornment={icon} {...props} />;
  }
);
InputWithIcon.displayName = "InputWithIcon";
