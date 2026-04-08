interface AuthHeaderProps {
    title: string;
    description: string;
  }
  
  export default function AuthHeader({
    title,
    description,
  }: AuthHeaderProps) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>
    );
  }