// Bilingual content (EN/ES). Values may contain HTML since some strings wrap
// nested markup (badges, emoji spans, links) - safe here because every value
// is authored by us, never user input.
const translations = {
  en: {
    "meta-title": "Alberto Baraza, Data Engineer",
    "meta-description": "Alberto Baraza, Senior Data Engineer. Clean pipelines, solid architecture, and systems that don't break.",

    "nav-about": "About",
    "nav-projects": "Projects",
    "nav-experience": "Experience",
    "nav-stack": "Stack",
    "nav-contact": "Contact",

    "hero-hi": "Hello there!",
    "hero-title": "Senior Data Engineer",
    "hero-lede": `
        Well-defined workflows and a clear objective. The foundation of a great project.
        I like working close to the hard problems,
        mentoring people around me, and building with a clear purpose.
      `,
    "hero-email-btn": "Email",

    "about-title": "About",
    "about-text": `
        I started out studying software engineering, and step by step I've shaped myself into a data engineer.<br>
        Small Bash, SQL, Java, and Python
        scripts first turned into end-to-end workflows, then into entire projects, and now into broader data
        architectures. I drive technical initiatives on a lean team, helping shape architecture, standards,
        and the technical roadmap.
        What ties it together: I like systems
        that fail loudly, recover cleanly, and don't need constant maintenance.
      `,

    "pl-bi": "BI Analyst",
    "pl-analyst": "Data Analyst",
    "pl-jr": "Jr Data Eng",
    "pl-de1": "Data Eng I",
    "pl-de2": "Data Eng II",
    "pl-senior": "Senior DE",
    "pl-annotation": "that's me now!",
    "pl-hint": "My career, one pipeline. Click a stage to jump to it.",

    "projects-title": "Projects",
    "proj-more-title": `More on GitHub <span class="project-card__arrow">↗</span>`,
    "proj-more-desc": "View my repositories and contributions on GitHub.",
    "proj-more-desc-live": "Browse the rest of my repositories and contributions.",
    "proj-no-description": "No description provided.",

    "apps-title": "Apps",
    "apps-what-the-bill-desc": "Your bills, charted. A dashboard that turns PDF invoices into cost and consumption trends, entirely in your browser: nothing is uploaded.",
    "apps-build-your-story-desc": "Build and export a polished CV in minutes: start from scratch, import from LinkedIn, or use your own AI assistant. Free, no sign-up.",
    "apps-whack-a-mole-desc": "A browser whack-a-mole game with a live turn queue, spectating, and a global leaderboard.",
    "apps-bling-bling-desc": "Personal finance dashboard with pluggable data sources (Google Sheets or CSV), multi-currency conversion to EUR, and interactive charts.",
    "apps-flashback-desc": "Photo culling tool that enriches your photos with accurate dates and locations, then helps you keep only the ones that truly matter.",

    "experience-title": "Experience",
    "tl-present": "Present",
    "tl-show-details": "Show details",
    "tl-hide-details": "Hide details",
    "tl-internship": "Internship",

    "tl-nexmart-aria": "Feb 2024 – Present",
    "tl-nexmart-role": "Senior Data Engineer",
    "tl-nexmart-bullets": `
              <li>Driving core data engineering initiatives within a lean team, shaping architecture, standards, and the technical roadmap</li>
              <li>Building a self-healing, idempotent data layer capable of fully rebuilding from scratch, enabling confident deployments and dramatically reducing failure recovery time</li>
              <li>Driving cross-functional collaboration with Data Science, ML Engineering, and IT Platform to evolve the data infrastructure and its standards</li>
              <li>Mentoring the junior data engineer on the team</li>
            `,

    "tl-glovo2-aria": "Jan 2022 – May 2023",
    "tl-glovo2-start": "Jan 2022",
    "tl-glovo2-role": "Data Engineer II",
    "tl-glovo2-bullets": `
              <li>Owned the full lifecycle (design → deploy → maintain) of fintech data pipelines using Apache Spark, Apache Airflow, Great Expectations, AWS, Docker, and GitHub Actions</li>
              <li>Mentored junior engineers and drove a team culture of knowledge sharing and continuous improvement</li>
              <li>Contributed to migrating the fintech analytical domain from a monolith to a data mesh / data products architecture</li>
            `,

    "tl-glovo1-aria": "Apr 2021 – Dec 2021",
    "tl-glovo1-start": "Apr 2021",
    "tl-glovo1-end": "Dec 2021",
    "tl-glovo1-role": "Data Engineer I",
    "tl-glovo1-bullets": `
                  <li>Joined as the first Data Engineer in the Fintech area; defined and built the foundational data processes for the domain</li>
                  <li>Collaborated with cross-functional product teams to translate business needs into scalable solutions, notably contributing to the payments analytical landscape</li>
                `,

    "tl-kimitecde-aria": "Oct 2020 – Jan 2021",
    "tl-kimitecde-end": "Jan 2021",
    "tl-kimitecde-role": "Junior Data Engineer",
    "tl-kimitecde-bullets": `
                  <li>Designed and implemented internal databases and data-driven processes from scratch</li>
                  <li>Automated tasks using PowerShell, Java, and Power Automate</li>
                  <li>Built integrations consuming REST APIs and implemented solutions with Office 365 tools (SharePoint, Power Automate)</li>
                `,

    "tl-kimitecan-aria": "Oct 2019 – Oct 2020",
    "tl-kimitecan-role": `Junior Data Analyst <span class="timeline__badge">Internship</span>`,
    "tl-kimitecan-bullets": `
                  <li>Carried out my Bachelor's thesis, applying Business Analytics to bio-sustainable techniques and the circular economy</li>
                  <li>Built Power BI dashboards for internal use and developed JDBC-based tools for data management across different DBMS platforms</li>
                  <li>Worked as SQL programmer writing custom queries using SAP B1</li>
                `,

    "tl-stuttgart-aria": "Mar 2019 – Jul 2019",
    "tl-stuttgart-role": `Business Intelligence Analyst <span class="timeline__badge">Internship</span>`,
    "tl-stuttgart-bullets": `
                  <li>Collaborated with Microsoft Germany on a data-streaming project; performed ETL from source systems into data marts</li>
                  <li>Implemented Star and Snowflake schemas and analyzed multidimensional data with OLAP tools</li>
                  <li>Built dashboards and reports with Power BI, Power Pivot, and SQL Server Analysis Services (SSAS)</li>
                `,

    "stack-title": "Stack",
    "stack-languages": "Languages",
    "stack-data-processing": "Data Processing",
    "stack-databases": "Databases",
    "stack-infra": "Infra &amp; Cloud",
    "stack-reporting": "Reporting &amp; Monitoring",
    "stack-hint": "Click a tool to see where I've used it.",

    "footer-cta": "Let's get to work.",

    "theme-light": "Light theme",
    "theme-dark": "Dark theme",
    "theme-system": "System theme",
    "copied": "Copied!",
  },

  es: {
    "meta-title": "Alberto Baraza, Ingeniero de Datos",
    "meta-description": "Alberto Baraza, Ingeniero de Datos Senior. Pipelines limpios, arquitectura sólida y sistemas que no fallan.",

    "nav-about": "Sobre mí",
    "nav-projects": "Proyectos",
    "nav-experience": "Experiencia",
    "nav-stack": "Tecnologías",
    "nav-contact": "Contacto",

    "hero-hi": "¡Hola!",
    "hero-title": "Ingeniero de Datos Senior",
    "hero-lede": `
        Flujos de trabajo bien definidos y un objetivo claro. La base de un gran proyecto.
        Me gusta trabajar cerca de los problemas difíciles,
        mentorizar a la gente que me rodea y construir con un propósito claro.
      `,
    "hero-email-btn": "Correo",

    "about-title": "Sobre mí",
    "about-text": `
        Empecé estudiando ingeniería del software y, paso a paso, me he ido formando como ingeniero de datos.<br>
        Los pequeños scripts de Bash,
        SQL, Java y Python, poco a poco se convirtieron en flujos de trabajo completos, luego en
        proyectos enteros y ahora en arquitecturas de datos más amplias. Lidero
        iniciativas técnicas en un equipo reducido, ayudando a definir la arquitectura, los
        estándares y la hoja de ruta técnica.
        ¿El hilo conductor? Me gustan los sistemas
        que fallan de forma ruidosa, se recuperan limpiamente y no necesitan mantenimiento constante.
      `,

    "pl-bi": "Analista BI",
    "pl-analyst": "Analista de Datos",
    "pl-jr": "Ing. Datos Jr",
    "pl-de1": "Ing. Datos I",
    "pl-de2": "Ing. Datos II",
    "pl-senior": "Ing. Datos Sr",
    "pl-annotation": "por aquí vamos",
    "pl-hint": "Mi carrera, un solo pipeline. Haz clic en una etapa para ir a ella.",

    "projects-title": "Proyectos",
    "proj-more-title": `Más en GitHub <span class="project-card__arrow">↗</span>`,
    "proj-more-desc": "Mira mis repositorios y contribuciones en GitHub.",
    "proj-more-desc-live": "Explora el resto de mis repositorios y contribuciones.",
    "proj-no-description": "Sin descripción.",

    "apps-title": "Apps",
    "apps-what-the-bill-desc": "Tus facturas, en gráficas. Un panel que convierte facturas en PDF en tendencias de coste y consumo, todo en tu navegador: no se sube nada.",
    "apps-build-your-story-desc": "Crea y exporta un CV cuidado en minutos: desde cero, importando de LinkedIn o con tu propio asistente de IA. Gratis y sin registro.",
    "apps-whack-a-mole-desc": "Un juego de machacatopos en el navegador con cola de turnos en directo, modo espectador y clasificación global.",
    "apps-bling-bling-desc": "Panel de finanzas personales con fuentes de datos intercambiables (Google Sheets o CSV), conversión multidivisa a EUR y gráficos interactivos.",
    "apps-flashback-desc": "Herramienta para depurar fotos: enriquece tus fotos con fechas y ubicaciones precisas y te ayuda a quedarte solo con las que de verdad importan.",

    "experience-title": "Experiencia",
    "tl-present": "Actualidad",
    "tl-show-details": "Ver detalles",
    "tl-hide-details": "Ocultar detalles",
    "tl-internship": "Prácticas",

    "tl-nexmart-aria": "Feb 2024 – Actualidad",
    "tl-nexmart-role": "Ingeniero de Datos Senior",
    "tl-nexmart-bullets": `
              <li>Lidero iniciativas clave de ingeniería de datos en un equipo reducido, dando forma a la arquitectura, los estándares y la hoja de ruta técnica</li>
              <li>Construyo una capa de datos autorreparable e idempotente capaz de reconstruirse por completo desde cero, lo que permite despliegues con confianza y reduce drásticamente el tiempo de recuperación ante fallos</li>
              <li>Impulso la colaboración multidisciplinar con Data Science, ML Engineering e IT Platform para evolucionar la infraestructura de datos y sus estándares</li>
              <li>Mentorizo al ingeniero de datos junior del equipo</li>
            `,

    "tl-glovo2-aria": "Ene 2022 – May 2023",
    "tl-glovo2-start": "Ene 2022",
    "tl-glovo2-role": "Ingeniero de Datos II",
    "tl-glovo2-bullets": `
              <li>Fui responsable del ciclo de vida completo (diseño → despliegue → mantenimiento) de pipelines de datos de fintech usando Apache Spark, Apache Airflow, Great Expectations, AWS, Docker y GitHub Actions</li>
              <li>Mentoricé a ingenieros junior e impulsé una cultura de equipo de intercambio de conocimiento y mejora continua</li>
              <li>Contribuí a migrar el dominio analítico de fintech de un monolito a una arquitectura de data mesh / data products</li>
            `,

    "tl-glovo1-aria": "Abr 2021 – Dic 2021",
    "tl-glovo1-start": "Abr 2021",
    "tl-glovo1-end": "Dic 2021",
    "tl-glovo1-role": "Ingeniero de Datos I",
    "tl-glovo1-bullets": `
                  <li>Me incorporé como el primer Ingeniero de Datos en el área de Fintech; definí y construí los procesos de datos fundacionales del dominio</li>
                  <li>Colaboré con equipos de producto multidisciplinares para traducir necesidades de negocio en soluciones escalables, contribuyendo notablemente al panorama analítico de pagos</li>
                `,

    "tl-kimitecde-aria": "Oct 2020 – Ene 2021",
    "tl-kimitecde-end": "Ene 2021",
    "tl-kimitecde-role": "Ingeniero de Datos Junior",
    "tl-kimitecde-bullets": `
                  <li>Diseñé e implementé bases de datos internas y procesos basados en datos desde cero</li>
                  <li>Automaticé tareas usando PowerShell, Java y Power Automate</li>
                  <li>Construí integraciones consumiendo APIs REST e implementé soluciones con herramientas de Office 365 (SharePoint, Power Automate)</li>
                `,

    "tl-kimitecan-aria": "Oct 2019 – Oct 2020",
    "tl-kimitecan-role": `Analista de Datos Junior <span class="timeline__badge">Prácticas</span>`,
    "tl-kimitecan-bullets": `
                  <li>Realicé el Trabajo de Fin de Grado, aplicando Business Analytics a técnicas biosostenibles y la economía circular</li>
                  <li>Construí dashboards de Power BI para uso interno y desarrollé herramientas basadas en JDBC para la gestión de datos entre distintos SGBD</li>
                  <li>Trabajé como programador SQL escribiendo consultas personalizadas usando SAP B1</li>
                `,

    "tl-stuttgart-aria": "Mar 2019 – Jul 2019",
    "tl-stuttgart-role": `Analista de Business Intelligence <span class="timeline__badge">Prácticas</span>`,
    "tl-stuttgart-bullets": `
                  <li>Colaboré con Microsoft Alemania en un proyecto de streaming de datos; realicé ETL desde sistemas fuente hacia data marts</li>
                  <li>Implementé esquemas en estrella y copo de nieve, y analicé datos multidimensionales con herramientas OLAP</li>
                  <li>Construí dashboards e informes con Power BI, Power Pivot y SQL Server Analysis Services (SSAS)</li>
                `,

    "stack-title": "Tecnologías",
    "stack-languages": "Lenguajes",
    "stack-data-processing": "Procesamiento de Datos",
    "stack-databases": "Bases de Datos",
    "stack-infra": "Infraestructura y Cloud",
    "stack-reporting": "Reporting y Monitorización",
    "stack-hint": "Haz clic en una herramienta para ver dónde la he usado.",

    "footer-cta": "Manos a la obra.",

    "theme-light": "Tema claro",
    "theme-dark": "Tema oscuro",
    "theme-system": "Tema del sistema",
    "copied": "¡Copiado!",
  },
};

const getStoredLang = () => {
  const stored = localStorage.getItem("lang");
  return stored === "en" || stored === "es" ? stored : null;
};

const detectLang = () => {
  const nav = (navigator.language || (navigator.languages && navigator.languages[0]) || "en").toLowerCase();
  return nav.indexOf("es") === 0 ? "es" : "en";
};

let currentLang = getStoredLang() || detectLang();

const t = (key) => (translations[currentLang] && translations[currentLang][key]) || translations.en[key] || "";

const applyTranslations = () => {
  document.documentElement.setAttribute("lang", currentLang);

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.innerHTML = t(el.dataset.i18n);
  });

  document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
    el.setAttribute("aria-label", t(el.dataset.i18nAria));
  });

  document.querySelectorAll("[data-i18n-default-label]").forEach((el) => {
    el.setAttribute("data-default-label", t(el.dataset.i18nDefaultLabel));
  });

  const metaDescription = document.getElementById("meta-description");
  if (metaDescription) metaDescription.setAttribute("content", t("meta-description"));

  // Toggle buttons carry their own show/hide state - the generic data-i18n
  // pass above just reset every one of them to "show", so fix up any that
  // are currently expanded.
  document.querySelectorAll('.timeline__toggle[aria-expanded="true"] span').forEach((span) => {
    span.textContent = t("tl-hide-details");
  });

  document.querySelectorAll(".lang-toggle__btn").forEach((btn) => {
    const active = btn.dataset.lang === currentLang;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-pressed", String(active));
  });

  document.dispatchEvent(new CustomEvent("langchange", { detail: { lang: currentLang } }));
};

const setLang = (lang) => {
  currentLang = lang === "es" ? "es" : "en";
  localStorage.setItem("lang", currentLang);
  applyTranslations();
};

document.addEventListener("DOMContentLoaded", () => {
  applyTranslations();

  document.querySelectorAll(".lang-toggle__btn").forEach((btn) => {
    btn.addEventListener("click", () => setLang(btn.dataset.lang));
  });
});

window.i18n = { t, getLang: () => currentLang, setLang };
