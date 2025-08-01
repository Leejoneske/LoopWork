
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
}

export const QuickActionCard = ({ title, description, icon: Icon, onClick }: QuickActionCardProps) => {
  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow h-full" 
      onClick={onClick}
    >
      <CardContent className="p-4 sm:p-6 text-center h-full flex flex-col justify-center">
        <Icon className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-2 sm:mb-4 text-primary" />
        <h3 className="font-semibold mb-1 sm:mb-2 text-sm sm:text-base">{title}</h3>
        <p className="text-xs sm:text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
};
