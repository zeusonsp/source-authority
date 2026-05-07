import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Props = {
  errors?: string[];
};

export function FormError({ errors }: Props) {
  if (!errors || errors.length === 0) return null;

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        {errors.length === 1 ? (
          errors[0]
        ) : (
          <ul className="list-disc pl-4">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        )}
      </AlertDescription>
    </Alert>
  );
}
