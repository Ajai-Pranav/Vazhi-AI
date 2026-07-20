import { EducationalStatus, UserField, ExperienceLevel } from "@/types";

export const EDUCATIONAL_STATUS_OPTIONS: EducationalStatus[] = [
  "Student",
  "Working Professional",
  "Job Seeker",
];

export const FIELD_OPTIONS: { value: UserField; label: string; icon: string; description: string }[] = [
  {
    value: "Computer Science / IT",
    label: "Computer Science / IT",
    icon: "💻",
    description: "Software development, web, ML, DevOps",
  },
  {
    value: "Mechanical Engineering",
    label: "Mechanical Engineering",
    icon: "⚙️",
    description: "CAD, manufacturing, design, automotive",
  },
  {
    value: "Civil Engineering",
    label: "Civil Engineering",
    icon: "🏗️",
    description: "Structural, construction, geotechnical",
  },
  {
    value: "Electronics & Communication",
    label: "Electronics & Communication",
    icon: "📡",
    description: "Embedded systems, PCB, VLSI, IoT",
  },
  {
    value: "Electrical & Electronics",
    label: "Electrical & Electronics",
    icon: "⚡",
    description: "Power systems, control, PLC/SCADA",
  },
  {
    value: "Arts & Science",
    label: "Arts & Science",
    icon: "🎓",
    description: "Science, maths, humanities, analytics",
  },
  {
    value: "Commerce",
    label: "Commerce",
    icon: "📊",
    description: "Accounting, finance, CA/CMA, business",
  },
  {
    value: "Other",
    label: "Other",
    icon: "🌐",
    description: "Any other field or interdisciplinary",
  },
];

export const EXPERIENCE_LEVELS: { value: ExperienceLevel; label: string; description: string }[] = [
  { value: "Absolute Beginner", label: "Absolute Beginner", description: "No prior knowledge in this area" },
  { value: "Beginner", label: "Beginner", description: "Basic understanding, little hands-on experience" },
  { value: "Intermediate", label: "Intermediate", description: "Comfortable with fundamentals, some projects done" },
  { value: "Advanced", label: "Advanced", description: "Strong expertise, real-world experience" },
];

export const CAREER_GOALS_BY_FIELD: Record<UserField, { value: string; label: string }[]> = {
  "Computer Science / IT": [
    { value: "Software Engineer", label: "Software Engineer" },
    { value: "Full Stack Web Developer", label: "Full Stack Web Developer" },
    { value: "Data Scientist / ML Engineer", label: "Data Scientist / ML Engineer" },
    { value: "DevOps / Cloud Engineer", label: "DevOps / Cloud Engineer" },
    { value: "Cybersecurity Analyst", label: "Cybersecurity Analyst" },
    { value: "Product Manager", label: "Product Manager" },
    { value: "Higher Studies (M.Tech / MS / MBA)", label: "Higher Studies (M.Tech / MS)" },
    { value: "Custom Goal", label: "Custom Goal..." },
  ],
  "Mechanical Engineering": [
    { value: "Mechanical Design Engineer", label: "Mechanical Design Engineer" },
    { value: "CAD/CAM Engineer", label: "CAD/CAM Engineer" },
    { value: "Manufacturing Engineer", label: "Manufacturing Engineer" },
    { value: "Government Job Aspirant", label: "Government Job / PSU" },
    { value: "Higher Studies (M.Tech / MS / MBA)", label: "Higher Studies (M.Tech / MS)" },
    { value: "Entrepreneur / Startup Founder", label: "Entrepreneur / Startup" },
    { value: "Custom Goal", label: "Custom Goal..." },
  ],
  "Civil Engineering": [
    { value: "Civil / Structural Engineer", label: "Civil / Structural Engineer" },
    { value: "Site Engineer", label: "Site Engineer" },
    { value: "Government Job Aspirant", label: "Government Job / PSU" },
    { value: "Higher Studies (M.Tech / MS / MBA)", label: "Higher Studies (M.Tech / MS)" },
    { value: "Project Manager", label: "Project Manager" },
    { value: "Custom Goal", label: "Custom Goal..." },
  ],
  "Electronics & Communication": [
    { value: "Embedded Systems / IoT Engineer", label: "Embedded Systems / IoT Engineer" },
    { value: "PCB / VLSI Design Engineer", label: "PCB / VLSI Design Engineer" },
    { value: "Signal Processing Engineer", label: "Signal Processing Engineer" },
    { value: "Government Job Aspirant", label: "Government Job / PSU" },
    { value: "Higher Studies (M.Tech / MS / MBA)", label: "Higher Studies (M.Tech / MS)" },
    { value: "Custom Goal", label: "Custom Goal..." },
  ],
  "Electrical & Electronics": [
    { value: "Power Systems Engineer", label: "Power Systems Engineer" },
    { value: "Control Systems Engineer", label: "Control Systems Engineer" },
    { value: "PLC / SCADA Engineer", label: "PLC / SCADA Engineer" },
    { value: "Government Job Aspirant", label: "Government Job / PSU" },
    { value: "Higher Studies (M.Tech / MS / MBA)", label: "Higher Studies (M.Tech / MS)" },
    { value: "Custom Goal", label: "Custom Goal..." },
  ],
  "Arts & Science": [
    { value: "Data Scientist / ML Engineer", label: "Data Scientist / ML Engineer" },
    { value: "Research Scientist", label: "Research Scientist" },
    { value: "Government Job Aspirant", label: "Government Job Aspirant" },
    { value: "Higher Studies (M.Tech / MS / MBA)", label: "Higher Studies (MA / MSc / PhD)" },
    { value: "Content Creator / Digital Marketing", label: "Content / Digital Marketing" },
    { value: "Custom Goal", label: "Custom Goal..." },
  ],
  "Commerce": [
    { value: "Chartered Accountant (CA)", label: "Chartered Accountant (CA)" },
    { value: "Business Analyst", label: "Business Analyst" },
    { value: "Finance Analyst", label: "Finance Analyst" },
    { value: "Higher Studies (M.Tech / MS / MBA)", label: "MBA / Higher Studies" },
    { value: "Entrepreneur / Startup Founder", label: "Entrepreneur / Startup" },
    { value: "Custom Goal", label: "Custom Goal..." },
  ],
  "Other": [
    { value: "Government Job Aspirant", label: "Government Job Aspirant" },
    { value: "Higher Studies (M.Tech / MS / MBA)", label: "Higher Studies" },
    { value: "Entrepreneur / Startup Founder", label: "Entrepreneur" },
    { value: "Custom Goal", label: "Custom Goal..." },
  ],
};

export const DOMAIN_TOOLS: Record<UserField, string[]> = {
  "Computer Science / IT": ["Python", "JavaScript", "React", "Node.js", "SQL", "Git", "Docker", "AWS", "Java", "C++"],
  "Mechanical Engineering": ["AutoCAD", "SolidWorks", "CATIA", "ANSYS", "MATLAB", "Creo", "Fusion 360", "NX"],
  "Civil Engineering": ["AutoCAD", "STAAD Pro", "ETABS", "Revit", "MS Project", "SAP2000", "PRIMAVERA"],
  "Electronics & Communication": ["Arduino", "Keil µVision", "Altium Designer", "MATLAB", "Proteus", "KiCad", "ESP32"],
  "Electrical & Electronics": ["MATLAB/Simulink", "ETAP", "AutoCAD Electrical", "PSCAD", "PLC (Siemens)", "HOMER"],
  "Arts & Science": ["Python", "R", "Excel", "SPSS", "Tableau", "MATLAB", "LaTeX"],
  "Commerce": ["Tally", "Excel", "SAP", "QuickBooks", "Power BI", "Python", "Tableau"],
  "Other": ["Excel", "Python", "Google Workspace", "Canva", "Notion"],
};
