import { useTheme } from '@//hooks/use-theme';

export default function AuthBrand() {
  const { isDark, mounted } = useTheme();

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex h-38 items-center justify-center">
        <img
          src={mounted && isDark ? '/logo-white.png' : '/logo.png'}
          alt="UTEZ"
          className="max-h-full w-auto object-contain select-none transition-opacity duration-300"
          draggable={false}
        />
      </div>
    </div>
  );
}