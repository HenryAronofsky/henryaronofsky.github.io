/* Everything the site says lives here. Stops appear along the walk in this
   order; each one gets a pop-up (title, subtitle, dates, highlight) and an
   expanded panel (everything else).

   Stop fields
     id         used in links, e.g. henryaronofsky.github.io/#bumblebee
     chapter    which header section it belongs to
     icon       pixel icon (see ICONS in sprites.js)
     landmark   'church' | 'gate' to stand in front of a building
     kicker     tiny label above the title
     tag        a few words for the header's drop-down list
     title, subtitle, dates, place, highlight
     summary    first paragraph of the expanded panel
     facts      [label, value] pairs shown as a small table
     bullets    list of points
     sections   [{ heading, text: [paragraphs] }]
     media      [{ type: 'image' | 'video', src, poster, alt, caption }]
     links      [{ label, href }]
     related    [{ label, to: stop id, note }] buttons that walk you there
     tags       short chips */
window.HA = window.HA || {};

HA.content = {
  person: {
    name: 'Henry Aronofsky',
    role: 'Student at Harvard University',
    tagline: 'Building tools at the intersection of hardware and software — from ocean robotics to factory automation.',
    location: 'Boston, MA',
    focus: 'Mechanical Engineering',
    status: 'Open to opportunities',
    email: 'henryaronofsky@gmail.com',
    linkedin: 'https://www.linkedin.com/in/haronofsky/',
    github: 'https://github.com/HenryAronofsky/',
    website: 'https://henryaronofsky.github.io/',
    resume: 'Henry_Aronofsky_Resume.pdf'
  },

  chapters: [
    { id: 'start', label: 'Start' },
    { id: 'education', label: 'Education' },
    { id: 'experience', label: 'Experience' },
    { id: 'portfolio', label: 'Portfolio' },
    { id: 'interests', label: 'Interests' },
    { id: 'contact', label: 'Contact' }
  ],

  stops: [
    {
      id: 'saint-anns',
      tag: 'High school',
      chapter: 'education',
      icon: 'book',
      landmark: 'church',
      kicker: 'Education',
      title: "Saint Ann's School",
      subtitle: 'High School Diploma',
      dates: 'Sep 2009 – Jul 2024',
      place: 'Brooklyn, NY',
      facts: [
        ['Diploma', 'High School'],
        ['Years', 'Sep 2009 – Jul 2024'],
        ['Location', 'Brooklyn, NY']
      ]
    },
    {
      id: 'harvard',
      tag: 'B.S. Mechanical Engineering',
      chapter: 'education',
      icon: 'cap',
      landmark: 'gate',
      kicker: 'Education',
      title: 'Harvard College',
      subtitle: 'B.S. in Mechanical Engineering (accredited)',
      dates: 'Expected graduation: May 2028',
      place: 'Cambridge, MA',
      highlight: 'GPA 3.9 / 4.0',
      facts: [
        ['Degree', 'Bachelor of Science in Mechanical Engineering (accredited)'],
        ['GPA', '3.9 / 4.0'],
        ['Graduation', 'May 2028 (expected)'],
        ['Focus', 'Robotics, manufacturing software']
      ],
      related: [
        { label: 'BumbleBee', note: 'Class project', to: 'bumblebee' },
        { label: 'Microrobotics Laboratory', note: 'Engineering research', to: 'microrobotics' },
        { label: 'Harvard-Radcliffe Dramatic Club', note: 'Sound engineer', to: 'hrdc' },
        { label: 'Jazz Performance', note: 'Double bass', to: 'jazz' }
      ]
    },

    {
      id: 'divergent',
      tag: 'Q&A engineering intern',
      chapter: 'experience',
      icon: 'printer',
      kicker: 'Experience',
      title: 'Divergent 3D',
      subtitle: 'Q&A Engineering Intern',
      dates: 'May 2026 – Sep 2026',
      highlight: 'Inspection solutions for metal 3D printing',
      bullets: [
        'Work with material and Q&A engineers to develop innovative inspection solutions to streamline metal 3D printing.',
        'Build a full-stack web application that can interface with printer data output and display relevant information to operators.'
      ]
    },
    {
      id: 'microrobotics',
      tag: 'Engineering research',
      chapter: 'experience',
      icon: 'rov',
      kicker: 'Experience · Ocean Shot',
      title: 'Harvard Microrobotics Laboratory',
      subtitle: 'Engineering Research',
      dates: 'Aug 2025 – Present',
      highlight: 'Deep-sea biopsy sampler for jellyfish, 1000 m+',
      bullets: [
        'Design and test a deep-sea electromagnetic biopsy sampler to be used in the field on jellyfish at depths exceeding 1000 meters.',
        'Fabricate gantry systems, 3D print and laser cut bracket supports, build charging and discharging circuits to control probe.'
      ],
      related: [{ label: 'Jellyfish Motion Rig', note: 'Project from the lab', to: 'jellyfish' }]
    },
    {
      id: 'hrdc',
      tag: 'Sound engineer',
      chapter: 'experience',
      icon: 'speaker',
      kicker: 'Experience',
      title: 'Harvard-Radcliffe Dramatic Club',
      subtitle: 'Sound Engineer / Sound Designer',
      dates: 'Aug 2024 – Present',
      highlight: 'Soundscapes for large-scale musicals',
      bullets: [
        'Plan and execute immersive soundscapes for large-scale musical theater productions.',
        "Load in, maintain, and fix speaker systems across Harvard's three historic live theater venues."
      ],
      related: [{ label: 'Musical Theater', note: 'Why I love it', to: 'theater' }]
    },
    {
      id: 'nanotronics',
      tag: 'Design engineering intern',
      chapter: 'experience',
      icon: 'chart',
      kicker: 'Experience',
      title: 'Nanotronics',
      subtitle: 'Design Engineering Intern',
      dates: 'May 2021 – Sep 2023',
      highlight: 'Data visualisation tools for factory efficiency',
      bullets: [
        'Work with designers and engineers to improve factory efficiency through data visualisation tools.',
        'Develop ways of increasing factory throughput and increasing operator training speed.'
      ]
    },

    {
      id: 'eurorackingit',
      tag: 'Analog synthesizer',
      chapter: 'portfolio',
      icon: 'synth',
      kicker: 'Personal Project',
      title: 'EuroRackingIt',
      subtitle: 'A fully analog 12-note synthesizer',
      highlight: 'Schmitt trigger oscillators, no microcontroller',
      summary:
        'A fully analog 12-note synthesizer. Key presses become a variable voltage that is tuned, shaped into a musical waveform, and pushed out as audio — with no microcontroller anywhere in the signal path.',
      bullets: [
        'Design and build a fully analog 12-note synthesizer.',
        'Implement Schmitt trigger oscillators, temperature feedback loops, and waveform converters to make a fully functional musical device.'
      ],
      media: [
        { type: 'image', src: 'portfolio/es50/breadboard-circuit.png', alt: 'Breadboard build of the analog synth', caption: 'Breadboard build' },
        { type: 'image', src: 'portfolio/es50/oscilloscope-sawtooth.jpg', alt: 'The synth\'s sawtooth wave on an oscilloscope', caption: 'The sawtooth output on the oscilloscope' },
        { type: 'image', src: 'portfolio/es50/circuit-schematic.png', alt: 'Full circuit schematic', caption: 'Full schematic' },
        { type: 'image', src: 'portfolio/es50/signal-flow-diagram.png', alt: 'Signal flow block diagram, from keyboard to audio output', caption: 'Signal flow, keyboard to audio output', wide: true }
      ],
      sections: [
        {
          heading: 'Keyboard interface',
          text: ['Each of the 12 keys taps a node on a resistor ladder, so pressing a key outputs a distinct voltage down a shared bus depending on where it sits in the divider.']
        },
        {
          heading: 'Tuning and oscillation',
          text: [
            'That voltage passes through an emitter follower and exponential converter, then into a tuning stage built from voltage adders and dividers that space the twelve tones to the equal-tempered scale. The oscillator core uses a 40106 hex Schmitt trigger inverter — wired with a diode, resistor, and capacitor — to generate a sawtooth wave at the tuned frequency.'
          ]
        },
        {
          heading: 'Output stage',
          text: ['The sawtooth is buffered, AC-coupled, and amplified before a waveform converter shapes it into the final tone, which passes through a second AC coupler and volume control to the audio output.']
        }
      ],
      links: [{ label: 'Download full report (PDF)', href: 'portfolio/es50/Report.pdf' }]
    },
    {
      id: 'bumblebee',
      tag: 'Competition robot',
      chapter: 'portfolio',
      icon: 'robot',
      kicker: 'Class Project · ES51 · Team of 5',
      title: 'BumbleBee',
      subtitle: '4WD, gearbox and servo actuated competition robot',
      highlight: 'Two full rounds, zero technical failures',
      summary:
        'A competition robot designed and built with a team of five ("The Hasanov Syndicate") for Harvard ES51\'s Turf Wars competition — a scoring arena that rewarded climbing ramps, collecting and storing objects, and a stacking challenge, all inside an 11"×11"×11" size limit.',
      bullets: [
        'Design a 4WD, gearbox and servo actuated robot that can translate in three dimensions and interact with various objects.',
        'Use turning (lathe), 3D printing, laser cutting, CNC milling, drill press, and saws to build parts.'
      ],
      media: [
        { type: 'image', src: 'portfolio/es51/bumblebee-robot.png', alt: 'BumbleBee, the finished competition robot', caption: 'BumbleBee — final build' },
        { type: 'image', src: 'portfolio/es51/scoop-lift-exploded-view.png', alt: 'Exploded CAD assembly of the scoop-lift mechanism', caption: 'Exploded assembly of the scoop-lift mechanism' }
      ],
      sections: [
        {
          heading: 'The challenge',
          text: [
            'Turf Wars scored robots on climbing a 30° ramp, collecting and storing six ping pong balls, picking up dog toys and hockey pucks to deposit in perimeter boxes, ringing a bell, and a separate stacking challenge with a ring, ball, and cube. Teams were limited to six actuators, four sheets of acrylic, and roughly ten weeks to design, fabricate, and test.'
          ]
        },
        {
          heading: 'Design',
          text: [
            'We compared concepts — a roller, a Sphero-style ball, a grabber, and several scoop variants — against each other with a Pugh matrix scored on height, hill-climbing ability, ball storage, and pick-up/drop-off performance. The winning "Dual Action" concept used a single 3D-printed scoop with built-in arm storage, driven by one servo through a hex shaft on a delrin support, so the same mechanism handled both ramp climbing and object collection. We also wired the remote control with rubber bands and inverted the polarity on a couple of components to make driving more intuitive.'
          ]
        },
        {
          heading: 'Result',
          text: ["We prioritized endurance over raw scoring potential. BumbleBee didn't win the competition, but it completed two full rounds with no technical failures."]
        }
      ],
      links: [{ label: 'Download full report (PDF)', href: 'portfolio/es51/Report.pdf' }]
    },
    {
      id: 'classic-cars',
      tag: 'Summer work',
      chapter: 'portfolio',
      icon: 'car',
      kicker: 'Summer Work',
      title: 'Classic Car Maintenance',
      subtitle: 'A 1951 Pontiac, a 1972 Ford and a 1979 Jaguar',
      highlight: 'Carburetors, coolant hoses and electrical systems',
      summary: 'Summers spent keeping three classic cars on the road — a 1951 Pontiac, a 1972 Ford, and a 1979 Jaguar.',
      bullets: ['Rebuild carburetors, replace coolant hoses and redesign electrical systems on a 1951 Pontiac, a 1972 Ford, and a 1979 Jaguar.'],
      media: [
        { type: 'image', src: 'portfolio/cars/refitted-v8-engine.jpg', alt: 'Refitted V8 engine', caption: 'Refitted engine', tall: true },
        { type: 'image', src: 'portfolio/cars/rebuilding-the-carburetor.jpg', alt: 'Working on the carburetor on top of the V8', caption: 'Rebuilding the carburetor', tall: true },
        { type: 'image', src: 'portfolio/cars/replacing-coolant-hoses.jpg', alt: 'Reaching under the hood to replace a coolant hose', caption: 'Replacing coolant hoses', tall: true }
      ]
    },
    {
      id: 'jellyfish',
      tag: 'Lab research rig',
      chapter: 'portfolio',
      icon: 'jelly',
      kicker: 'Harvard Microrobotics Laboratory · Ongoing',
      title: 'Jellyfish Motion Rig',
      subtitle: 'Stepper-driven rig for jellyfish research',
      highlight: 'Arduino Mega + DM542T stepper driver',
      summary:
        'A stepper-motor-driven rig built to observe and record jellyfish movement, part of ongoing research at the Harvard Microrobotics Laboratory into ocean exploration and bio-data recovery tools.',
      media: [
        { type: 'image', src: 'portfolio/wood-lab/jellyfish-in-the-tank.jpg', alt: 'Jellyfish swimming in a round, green-lit observation tank', caption: 'Jellyfish in the observation tank' },
        { type: 'image', src: 'portfolio/wood-lab/gantry-rig-setup.jpg', alt: 'Aluminium gantry with stepper motors mounted over a glass tank', caption: 'The gantry rig over the tank', tall: true },
        { type: 'image', src: 'portfolio/wood-lab/camera-and-gantry.jpg', alt: 'Camera on a tripod filming the tank under the gantry, shaded with a cloth', caption: 'Setting up the camera to film the tank', tall: true },
        { type: 'image', src: 'portfolio/wood-lab/stepper-driver.jpg', alt: 'Stepper motor and driver controlled by an Arduino Mega', caption: 'Stepper driver and control electronics', tall: true }
      ],
      sections: [
        {
          heading: 'Overview',
          text: ['An Arduino Mega drives a stepper motor through a DM542T digital stepping driver to control the rig, while the jellyfish enclosure allows for controlled observation. This work is ongoing — more detail to follow as the project develops.']
        }
      ],
      related: [{ label: 'Harvard Microrobotics Laboratory', note: 'Where this lives', to: 'microrobotics' }]
    },
    {
      id: 'double-bass',
      tag: 'Built from scratch',
      chapter: 'portfolio',
      icon: 'bass',
      kicker: 'Side project',
      title: 'Scratch-Built Double Bass',
      subtitle: 'A four-string upright bass built from reclaimed lumber',
      highlight: 'Carved by hand from raw lumber',
      summary:
        'A four-string upright bass built from scratch out of reclaimed lumber — neck, pegbox, and body carved and assembled by hand, strung and tuned to play.',
      media: [
        { type: 'image', src: 'portfolio/double-bass/neck-and-body-detail.png', alt: 'Scratch-built double bass, neck and body detail', caption: 'Neck and body detail', tall: true },
        { type: 'image', src: 'portfolio/double-bass/playing-the-finished-bass.png', alt: 'Playing the finished double bass', caption: 'Finished instrument', tall: true }
      ],
      sections: [
        {
          heading: 'Overview',
          text: [
            'Built as a personal project outside of coursework, this bass is shaped from reclaimed wood rather than a kit — the neck and fingerboard planed and carved by hand, the pegbox fitted with real tuning machines, and four strings run down to a plank body. It plays like a proper upright bass, just built from nothing but raw lumber and hand tools.'
          ]
        }
      ],
      related: [{ label: 'Jazz Performance', note: 'Where it gets played', to: 'jazz' }]
    },
    {
      id: 'plumbing',
      tag: 'Hands-on building',
      chapter: 'portfolio',
      icon: 'wrench',
      kicker: 'Side project',
      title: 'Plumbing & Construction',
      subtitle: 'Pipe fitting, plumbing, and general construction work',
      highlight: 'Drain lines, hose fittings and fence stakes',
      summary: 'Hands-on plumbing and construction work — cutting and fitting pipe, running a drain line, and building with basic hand tools.',
      media: [
        { type: 'image', src: 'portfolio/plumbing-and-construction/connecting-a-washer-hose.jpg', alt: 'Connecting the hose behind a washing machine', caption: 'Connecting a washing machine hose', tall: true },
        { type: 'image', src: 'portfolio/plumbing-and-construction/cutting-drain-pipe.jpg', alt: 'Cutting a length of black drain pipe with a hacksaw', caption: 'Cutting drain pipe to fit', tall: true },
        { type: 'image', src: 'portfolio/plumbing-and-construction/driving-fence-stakes.jpg', alt: 'Driving a wooden fence stake into the ground with a sledgehammer', caption: 'Driving stakes for a fence', tall: true }
      ],
      sections: [
        {
          heading: 'Overview',
          text: ['General plumbing and construction work around the house — cutting and fitting drain pipe, connecting a washing machine hose, and framing with wooden stakes.']
        }
      ]
    },

    {
      id: 'theater',
      tag: 'On stage and backstage',
      chapter: 'interests',
      icon: 'spotlight',
      kicker: 'Interest',
      title: 'Musical Theater',
      subtitle: 'On stage and behind the board',
      highlight: 'Both sides of the curtain',
      summary:
        "Musical theater is where I learned to work the way engineering teams work — a fixed deadline, a room full of people with different specialties, and a show that has to run whether or not everything went to plan. I've spent time on both sides of the curtain: performing, and building and running the technical side of productions.",
      sections: [
        {
          text: [
            'What keeps me coming back is the rehearsal process. A show gets built the same way a prototype does — rough it in, run it, find what breaks, fix it, run it again — except the iteration loop is measured in days and the final revision is performed live.'
          ]
        }
      ],
      related: [{ label: 'Harvard-Radcliffe Dramatic Club', note: 'Sound engineer and designer', to: 'hrdc' }]
    },
    {
      id: 'jazz',
      tag: 'Upright bass',
      chapter: 'interests',
      icon: 'notes',
      kicker: 'Interest',
      title: 'Jazz Performance',
      subtitle: 'Double Bassist · Harvard Jazz Orchestra',
      dates: 'Sep 2026 – Present',
      highlight: 'Upright bass — the thing the arrangement stands on',
      summary:
        'I play upright bass in jazz settings — combo playing, standards, and the walking bass lines that hold a tune together while everyone else takes a turn out front. The bass is a structural job more than a melodic one, which is probably why it suits me: you are the thing the rest of the arrangement stands on.',
      sections: [
        {
          text: [
            'Jazz is also the one place where I do my best work without a plan. A chart gives you the changes and the form and nothing else, so the playing is made in real time, in response to whoever else is in the room. It is the closest thing I have found to thinking out loud with other people.',
            'My interest in the instrument eventually ran past playing it — I built a four-string upright double bass from scratch out of reclaimed lumber, carving the neck and fingerboard by hand.',
            'I play double bass with the Harvard Jazz Orchestra, which I joined in September 2026.'
          ]
        }
      ],
      media: [
        { type: 'image', src: 'interests/music/playing-bass-with-the-band.jpg', alt: 'Henry playing upright bass with a jazz group', caption: 'On upright bass with the band', tall: true }
      ],
      related: [{ label: 'Scratch-Built Double Bass', note: 'The bass I built', to: 'double-bass' }],
      tags: ['Jazz', 'Double bass', 'Standards']
    },
    {
      id: 'sailing',
      tag: 'Summers on the water',
      chapter: 'interests',
      icon: 'sailboat',
      kicker: 'Interest',
      title: 'Sailing',
      subtitle: 'Summers on the water',
      highlight: 'Counselor at Tivoli Sailing Company, 2018 – 2023',
      facts: [
        ['Camp', 'Tivoli Sailing Company'],
        ['Role', 'Summer Camp Counselor'],
        ['Years', 'Jan 2018 – Jul 2023']
      ]
    },
    {
      id: 'board-games',
      tag: 'Strategy',
      chapter: 'interests',
      icon: 'games',
      kicker: 'Interest',
      title: 'Board Games',
      subtitle: 'Strategy around a table'
    },

    {
      id: 'contact',
      tag: 'Say hello',
      chapter: 'contact',
      icon: 'mailbox',
      kicker: 'Thanks for walking by',
      title: "Let's talk",
      subtitle: 'Email, LinkedIn, GitHub — or grab my résumé',
      highlight: 'henryaronofsky@gmail.com',
      contact: true
    }
  ]
};
