import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

interface CPXResearchWidgetProps {
  design: 'fullcontent' | 'sidebar' | 'single';
  limit?: number;
}

export const CPXResearchWidget = ({ design, limit = 8 }: CPXResearchWidgetProps) => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Configure CPX Research based on design type
    const getThemeStyle = () => {
      switch (design) {
        case 'fullcontent': return 1;
        case 'sidebar': return 2;
        case 'single': return 3;
        default: return 1;
      }
    };

    const script1 = {
      div_id: `cpx-${design}`,
      theme_style: getThemeStyle(),
      order_by: 1, // 1 for best score, 2 for best money, 3 for best conversion rate
      display_mode: 3,
      ...(limit && { limit_surveys: limit })
    };

    // Get saved App ID from localStorage
    const savedAppId = localStorage.getItem("cpx_app_id");
    if (!savedAppId) {
      return; // Don't load if not configured
    }

    const config = {
      general_config: {
        app_id: parseInt(savedAppId), // Use saved CPX Research App ID
        ext_user_id: user.id, // Your user's unique ID
        subid_1: "", // Optional tracking parameter
        subid_2: "", // Optional tracking parameter
      },
      style_config: {
        text_color: "hsl(var(--foreground))",
        survey_box: {
          topbar_background_color: "hsl(var(--primary))",
          box_background_color: "hsl(var(--background))",
          rounded_borders: true,
          stars_filled: "hsl(var(--warning))",
          stars_empty: "hsl(var(--muted))",
          accent_color_small_box: "hsl(var(--primary))",
          place_stars_bottom_small_box: true
        },
      },
      script_config: [script1],
      debug: false,
      useIFrame: true,
      iFramePosition: 3 // 1 right, 2 left, 3 center
    };

    // Set global config
    (window as any).config = config;

    // Load CPX Research script
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://cdn.cpx-research.com/assets/js/script_tag_v2.0.js';
    script.async = true;
    
    // Clean up any existing script
    const existingScript = document.querySelector('script[src*="cpx-research.com"]');
    if (existingScript) {
      existingScript.remove();
    }
    
    document.head.appendChild(script);

    return () => {
      // Cleanup
      if (script && script.parentNode) {
        script.parentNode.removeChild(script);
      }
      delete (window as any).config;
    };
  }, [user, design, limit]);

  if (!user) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Please log in to view available surveys
      </div>
    );
  }

  const getContainerStyle = () => {
    switch (design) {
      case 'fullcontent':
        return { minHeight: '400px', width: '100%' };
      case 'sidebar':
        return { height: '300px', width: '300px' };
      case 'single':
        return { height: '169px', width: '348px' };
      default:
        return { minHeight: '400px', width: '100%' };
    }
  };

  return (
    <div className="cpx-research-container">
      <div 
        id={`cpx-${design}`}
        style={getContainerStyle()}
        className="border rounded-lg bg-card"
      />
    </div>
  );
};