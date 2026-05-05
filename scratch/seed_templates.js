const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedTemplates() {
  const templates = [
    {
      title: "Senior Fullstack Engineer Assessment",
      type: "skill_test",
      description: "Comprehensive test covering React, Node.js, and System Design.",
      questions: [
        { q: "Explain the difference between SSR and CSR.", type: "text" },
        { q: "How do you optimize a React application?", type: "text" }
      ],
      duration: 60,
      passThreshold: 70,
    },
    {
      title: "Cognitive Ability Test (G-Factor)",
      type: "cognitive",
      description: "Assesses logical reasoning, numerical aptitude, and verbal comprehension.",
      questions: [],
      duration: 30,
      passThreshold: 60,
    },
    {
      title: "Culture Fit & Personality Profile",
      type: "personality",
      description: "Measures alignment with company values and soft skills.",
      questions: [],
      duration: 15,
      passThreshold: 0,
    },
    {
      title: "Frontend Development (React/Tailwind)",
      type: "skill_test",
      description: "Practical test for building responsive UI components.",
      questions: [],
      duration: 45,
      passThreshold: 75,
    }
  ];

  for (const t of templates) {
    await prisma.assessmentTemplate.upsert({
      where: { id: t.title }, // Using title as a pseudo-unique for seeding if ID is missing, but schema says ID is uuid.
      update: {},
      create: {
        ...t,
        id: undefined // Let prisma generate UUID
      }
    });
  }

  console.log("Templates seeded successfully!");
}

seedTemplates()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
