export const DETAILED_SOFT_ISOLATION_ROUTES = [
  'application-packaging-machinery.html',
  'blog-rotary-joint-leaking.html',
  'application-automation-rotary-tables.html',
  'application-pneumatic-tools-hose-anti-twist.html',
  'blog-seal-replacement.html',
  'blog-threaded-vs-flange.html',
  'application-robot-end-of-arm-tooling.html',
  'blog-rotary-joint-materials.html',
];

export const SOFT_ISOLATION_TOPIC_CONTENT = {
  en: {
    'application-packaging-machinery.html': {
      metaDescription: 'Plan an air rotary union for indexing, filling, capping, sealing, and other packaging machinery by matching circuits, flow, speed, mounting, and cleaning conditions.',
      heroText: 'Plan compressed-air or vacuum transfer for rotating packaging stations without twisting hoses or mixing machine circuits.',
      opening: 'Packaging machines often place pneumatic cylinders, grippers, vacuum cups, or blow-off nozzles on a rotating carousel while the supply manifold remains fixed. A rotary union carries those services across the rotating interface. The correct configuration follows the machine circuit and mechanical layout; it does not follow the packaging-machine label alone.',
      sections: [
        {
          heading: 'Where the rotary union fits in a packaging machine',
          paragraphs: [
            'Typical locations include indexing tables, filling and capping carousels, rotary sealing stations, label-handling mechanisms, and product-transfer turrets. Separate passages can serve clamp and release, vacuum and blow-off, or multiple independently controlled actuators.',
            'Start with the function at each rotating station. A circuit that must hold pressure, switch independently, or remain isolated from vacuum needs its own defined passage. Electrical signals, wash fluid, or other services may require separate interfaces or a custom combined design.',
          ],
        },
        {
          heading: 'Three decisions that determine the configuration',
          points: [
            ['Circuit plan', 'Map every rotating function, its medium, direction of flow, and whether it must remain independent from the other passages.'],
            ['Operating profile', 'Provide normal and maximum pressure, required flow, rotational speed, start-stop frequency, temperature, and the cleaning environment.'],
            ['Mechanical integration', 'Check the available envelope, center-bore need, fixed and rotating sides, mounting features, port access, hose support, and service clearance.'],
          ],
        },
        {
          heading: 'A practical packaging-machine review sequence',
          ordered: true,
          points: [
            ['Mark the rotating circuits', 'Label clamp, release, vacuum, blow-off, and any other functions on the pneumatic diagram.'],
            ['Check peak demand', 'Size for the functions that operate together, including acceptable pressure drop at the farthest actuator.'],
            ['Compare the physical interface', 'Verify ports, mounting pattern, overall size, center clearance, and hose routing against the machine layout.'],
            ['Commission one passage at a time', 'Begin at low pressure and low speed, verify function and leakage, then increase to the intended operating condition.'],
          ],
        },
      ],
      inquiryHeading: 'Review a packaging-machine rotary union',
      inquiryText: 'Send the machine layout, pneumatic or vacuum diagram, passage functions, pressure, flow, speed, mounting space, cleaning conditions, and annual quantity. We can compare standard models and identify where a custom interface is justified.',
    },
    'application-automation-rotary-tables.html': {
      metaDescription: 'Select an air rotary union for automation rotary tables by defining clamp, release, locating, blow-off, passage, speed, center-bore, and mounting requirements.',
      heroText: 'Route compressed air through indexing and continuously rotating automation tables while keeping each machine function clearly separated.',
      opening: 'Automation rotary tables may rotate between workstations, stop for an assembly process, or run continuously. Pneumatic functions on the moving side can include clamping, locating pins, part ejection, blow-off, and fixture release. The rotary union must match both the circuit logic and the table mechanics.',
      sections: [
        {
          heading: 'Match the union to the table cycle',
          paragraphs: [
            'An index-and-dwell table and a continuously rotating table impose different motion and duty conditions. Record the real speed during motion, acceleration frequency, dwell time, cycles per shift, and whether pressure must be maintained while the table is stationary.',
            'Count independent functions rather than simply counting hoses. Clamp and release may need separate passages; several identical fixtures may share a manifold only when the machine circuit permits it. A required center opening for cables, shafts, or tooling can be as important as passage count.',
          ],
        },
        {
          heading: 'Interface checks for a rotary table',
          points: [
            ['Pneumatic circuit', 'Define every passage function, flow direction, pressure, flow demand, and acceptable cross-connection risk.'],
            ['Table geometry', 'Confirm center bore, pilot diameter, bolt pattern, axial length, port orientation, and access for fittings.'],
            ['Loads and alignment', 'Support hoses and manifolds independently so table runout, bending load, or anti-rotation hardware does not load the rotary union.'],
          ],
        },
        {
          heading: 'From table drawing to model selection',
          ordered: true,
          points: [
            ['Share a section view', 'Show the table centerline, fixed and rotating parts, available envelope, and adjacent cables or shafts.'],
            ['Attach the circuit diagram', 'Identify which functions operate together and which must remain isolated.'],
            ['State the real cycle', 'Include normal and maximum pressure, speed, temperature, starts per hour, and hours per day.'],
            ['Verify the assembled table', 'After alignment, test every passage at rest and during controlled rotation before production use.'],
          ],
        },
      ],
      inquiryHeading: 'Match a rotary union to your automation table',
      inquiryText: 'Send the table section drawing, pneumatic diagram, required center bore, passage functions, pressure, flow, index cycle or RPM, mounting envelope, and quantity for a model comparison.',
    },
    'application-pneumatic-tools-hose-anti-twist.html': {
      metaDescription: 'Choose an air swivel for pneumatic tools and hose anti-twist service by checking flow, pressure drop, movement, thread, hose load, and safety requirements.',
      heroText: 'Reduce hose twist at pneumatic tools and suspended workstations while preserving airflow and safe tool handling.',
      opening: 'An air swivel allows relative movement between a compressed-air hose and a pneumatic tool. It can improve handling and reduce repeated hose twisting, but it is not automatically suitable as a high-speed rotary union, torque-reaction member, structural joint, or lifting point.',
      sections: [
        {
          heading: 'Define the motion before choosing a swivel',
          paragraphs: [
            'Hand tools usually need intermittent angular movement as the operator changes position. Balancers, torque tools, reels, and articulated fixtures may impose wider or more frequent rotation. State whether the connection oscillates, turns occasionally, or rotates continuously, and identify any side pull from the hose.',
            'Airflow matters as much as thread size. A compact swivel with a restricted internal passage can create pressure drop, slow the tool, or change torque performance. Use the tool manufacturer’s air demand and minimum inlet pressure when reviewing the flow path.',
          ],
        },
        {
          heading: 'Checks for tool and hose service',
          points: [
            ['Air performance', 'Provide supply pressure, peak flow, duty cycle, air quality, lubrication practice, and the minimum pressure required at the tool.'],
            ['Connection and movement', 'Match both thread standards, hose size, rotation range, bend radius, and the space available around the operator’s grip.'],
            ['Mechanical safety', 'Use strain relief and hose support; do not use the swivel to carry tool weight, react tightening torque, or restrain a whipping hose.'],
          ],
        },
        {
          heading: 'How to assess an anti-twist installation',
          ordered: true,
          points: [
            ['Inspect the existing hose', 'Replace damaged hose or fittings before treating a leak or stiffness problem as a swivel problem.'],
            ['Measure the required movement', 'Observe the real tool motion and record rotation angle, frequency, hose pull, and interference points.'],
            ['Check airflow and interfaces', 'Compare pressure, flow, port threads, sealing method, and hose diameter with the proposed swivel.'],
            ['Test under normal handling', 'Leak-test first, then check free movement, pressure at the tool, and hose behavior through the complete work cycle.'],
          ],
        },
      ],
      inquiryHeading: 'Review an air-swivel application',
      inquiryText: 'Send the tool model, air consumption, supply pressure, thread and hose sizes, movement pattern, photos of the connection, and annual quantity. We can review a standard swivel or a custom compact interface.',
    },
    'application-robot-end-of-arm-tooling.html': {
      metaDescription: 'Plan an air rotary union for robot end-of-arm tooling by mapping gripper, vacuum, blow-off, wrist motion, payload, hose routing, and interface requirements.',
      heroText: 'Supply pneumatic grippers, vacuum cups, blow-off, and other end-of-arm functions through a rotating robot wrist without uncontrolled hose winding.',
      opening: 'Robot end-of-arm tooling can combine grippers, vacuum circuits, blow-off, tool changers, and sensors in a small moving envelope. A rotary union can transfer pneumatic services through a rotating axis, but passage layout, wrist motion, payload, and the tool interface must be reviewed together.',
      sections: [
        {
          heading: 'Map the services at the robot wrist',
          paragraphs: [
            'List each gripper, vacuum zone, release circuit, purge line, and blow-off function. Identify which functions operate simultaneously and which must remain isolated. Do not combine circuits simply because they use the same supply pressure.',
            'Electrical power, sensor signals, data, coolant, or hydraulic service require their own compatible interfaces. A pneumatic rotary union can be part of a combined assembly, but the electrical and fluid requirements must be specified separately rather than inferred from the air-passage count.',
          ],
        },
        {
          heading: 'Robot integration factors',
          points: [
            ['Motion and duty', 'Provide axis rotation range, maximum speed, acceleration, reversals, cycles per hour, and whether unlimited rotation is required.'],
            ['Payload and envelope', 'Include union mass, tool center of gravity, inertia limits, center-bore needs, wrist bolt pattern, and collision clearance.'],
            ['Piping and serviceability', 'Support hoses, preserve bend radius, protect lines from pinch points, and leave access for fittings and replacement.'],
          ],
        },
        {
          heading: 'A useful EOAT selection package',
          ordered: true,
          points: [
            ['Provide the wrist and tool drawings', 'Show the robot flange, tool plate, centerline, mounting stack, and available space.'],
            ['Provide the service map', 'List medium, pressure, flow, passage function, valve location, and simultaneous demand.'],
            ['Provide the motion profile', 'Include axis range, speed, acceleration, reversals, cycle time, and expected operating hours.'],
            ['Validate on the robot', 'Check leakage, hose behavior, collision clearance, payload data, and each tool function at reduced speed before full production.'],
          ],
        },
      ],
      inquiryHeading: 'Review a robot wrist or EOAT interface',
      inquiryText: 'Send the robot model, wrist and tool drawings, pneumatic circuit, passage functions, pressure, flow, motion profile, payload limits, other required services, and annual quantity.',
    },
    'blog-rotary-joint-leaking.html': {
      metaDescription: 'Diagnose a leaking rotary union by locating the leak, separating fitting and seal faults, checking alignment and operating conditions, and testing each passage safely.',
      heroText: 'Use a controlled diagnostic sequence to separate hose, fitting, static-seal, rotating-seal, and cross-passage faults before replacing parts.',
      opening: 'A visible air or fluid leak does not always mean the internal rotary seal has failed. Loose fittings, damaged tubing, contaminated sealing faces, side load, misalignment, excessive operating conditions, or a cross-passage fault can produce similar symptoms. Isolate the machine before inspection and identify the leak location before disassembly.',
      sections: [
        {
          heading: 'Start with the leak location and timing',
          paragraphs: [
            'Observe whether leakage comes from a hose connection, a stationary body joint, the rotating interface, a drain or vent, or another passage. Note whether it appears while stationary, only during rotation, after warm-up, or only when a specific circuit is pressurized.',
            'These observations narrow the fault. A fitting leak can often be corrected without opening the union. Leakage that changes with speed, shaft position, temperature, or hose movement points toward alignment, external load, surface condition, or a dynamic sealing problem.',
          ],
        },
        {
          heading: 'Common causes to check',
          points: [
            ['External connections', 'Inspect tubing cuts, ferrules, thread condition, sealing method, adapters, and tightening without exceeding the fitting specification.'],
            ['Installation condition', 'Check concentricity, shaft runout, rigid piping, hose tension, bending load, anti-rotation restraint, and contamination around the rotating interface.'],
            ['Operating condition', 'Compare actual medium, pressure, speed, temperature, duty cycle, filtration, and lubrication with the selected configuration.'],
          ],
        },
        {
          heading: 'Leak diagnostic sequence',
          ordered: true,
          points: [
            ['Make the machine safe', 'Stop rotation, isolate every energy source, depressurize all passages, and clean the area before inspection.'],
            ['Test external joints', 'Pressurize one passage at a time under controlled conditions and use an appropriate leak-detection method on hoses and fittings.'],
            ['Separate static and rotating behavior', 'Record leakage at rest and during slow rotation without exceeding the published limits.'],
            ['Inspect before replacing seals', 'If the leak is internal, check the shaft, sealing surfaces, bearings, contamination, and alignment; a new seal alone will not correct damaged hardware.'],
            ['Retest every passage', 'After repair, test passage isolation and leakage at low pressure and speed before returning to normal operation.'],
          ],
        },
      ],
      inquiryHeading: 'Request help diagnosing a rotary-union leak',
      inquiryText: 'Send the model, leak location, photos or video, medium, pressure, speed, temperature, duty cycle, installation drawing, operating hours, and what changed before the leak appeared.',
    },
    'blog-seal-replacement.html': {
      metaDescription: 'Replace rotary-union seals safely by confirming the fault, using the correct seal set, inspecting hardware, controlling cleanliness, and recommissioning each passage.',
      heroText: 'Confirm that the seal is the real fault, then protect sealing surfaces and verify the repaired rotary union before returning it to service.',
      opening: 'Seal replacement can restore a serviceable rotary union, but it is not a universal cure for leakage. A scored shaft, worn bearing, corroded sealing surface, wrong medium, excessive side load, or damaged fitting can cause a new seal to leak again. Diagnose the assembly and obtain the correct model-specific seal set before opening it.',
      sections: [
        {
          heading: 'Decide whether a seal replacement is appropriate',
          paragraphs: [
            'Confirm the exact model and revision, then locate the leak and compare the operating condition with the selected configuration. Check external fittings and installation alignment first. If the body, shaft, bearing, or sealing land is damaged, repair or replacement of the complete assembly may be more reliable than installing seals alone.',
            'Seal material and geometry must match the medium, pressure, temperature, speed, and mating surfaces. Do not substitute a visually similar O-ring or dynamic seal without confirming its dimensions and material compatibility.',
          ],
        },
        {
          heading: 'Preparation that prevents repeat leakage',
          points: [
            ['Correct parts', 'Use the seal kit, assembly drawing, tools, lubricant, and tightening data for the exact rotary-union configuration.'],
            ['Clean work area', 'Keep lint, chips, abrasive dust, damaged picks, and unapproved cleaning agents away from seals and sealing surfaces.'],
            ['Inspection criteria', 'Check shafts, grooves, sealing lands, bearings, threads, and ports for wear, corrosion, burrs, scoring, or embedded contamination.'],
          ],
        },
        {
          heading: 'Seal replacement and recommissioning sequence',
          ordered: true,
          points: [
            ['Isolate and document', 'Lock out the machine, depressurize every passage, mark orientation, and photograph the piping and component order.'],
            ['Disassemble without scratching', 'Use the specified tools and protect precision surfaces; do not pry across a sealing land.'],
            ['Clean and inspect', 'Remove residue without changing dimensions, then decide whether the hardware is suitable for reuse.'],
            ['Install without twisting', 'Lubricate only as specified, protect seal lips from threads and sharp edges, and confirm each seal is seated correctly.'],
            ['Reassemble to the correct data', 'Restore orientation, fasteners, fittings, and anti-rotation support using the model and fitting requirements.'],
            ['Test progressively', 'Check each passage for isolation and leakage at low pressure, then rotate slowly and increase duty while monitoring temperature and friction.'],
          ],
        },
      ],
      inquiryHeading: 'Identify the correct seal-repair path',
      inquiryText: 'Send the rotary-union model, serial or revision information if available, medium, pressure, speed, leak location, photos of the removed parts, and shaft or sealing-surface condition.',
    },
    'blog-threaded-vs-flange.html': {
      metaDescription: 'Compare threaded and flange-mounted rotary unions by envelope, alignment, anti-rotation, piping load, installation access, and service requirements.',
      heroText: 'Choose the mounting interface from the machine structure and service plan, not from the rotary union’s outside appearance alone.',
      opening: 'Threaded and flange-mounted rotary unions can both provide reliable rotating transfer when the interface is designed correctly. The better choice depends on available space, alignment method, load path, connection access, removal procedure, and how the fixed and rotating sides are supported.',
      sections: [
        {
          heading: 'How the two mounting approaches differ',
          paragraphs: [
            'A threaded connection can be compact and direct, but thread engagement, sealing method, installation torque, orientation, and removal access all matter. The surrounding structure must prevent hoses or fittings from imposing bending or torsional load on the union.',
            'A flange can provide a defined bolt pattern and locating feature, which may simplify orientation and repeatable removal. It generally needs more radial space and a suitable mating face. A flange does not correct poor concentricity or eliminate the need for hose support and anti-rotation control.',
          ],
        },
        {
          heading: 'Compare these machine-level factors',
          points: [
            ['Alignment and load path', 'Determine how the rotating axis is located and how axial, radial, bending, and torsional loads are kept out of the rotary union.'],
            ['Assembly and service access', 'Check tool clearance, fitting access, orientation control, replacement time, and whether adjacent components must be removed.'],
            ['Interface definition', 'Specify thread standard and engagement or flange pilot, bolt pattern, fasteners, sealing face, tolerances, and fixed/rotating-side responsibility.'],
          ],
        },
        {
          heading: 'A practical mounting decision process',
          ordered: true,
          points: [
            ['Draw both interfaces in section', 'Include the machine shaft, housing, union, fittings, hoses, supports, and removal direction.'],
            ['Check assembly tolerances', 'Review concentricity, runout, locating features, thread or flange tolerances, and thermal movement.'],
            ['Review the service procedure', 'Confirm how technicians isolate, access, remove, reinstall, and leak-test the union.'],
            ['Choose from total integration risk', 'Select the interface that controls alignment and external loads with the fewest special parts and the clearest maintenance procedure.'],
          ],
        },
      ],
      inquiryHeading: 'Compare threaded and flange interfaces for your machine',
      inquiryText: 'Send a section drawing of the shaft and housing, available envelope, fixed and rotating sides, speed, pressure, port direction, hose routing, expected service access, and annual quantity.',
    },
    'blog-rotary-joint-materials.html': {
      metaDescription: 'Compare aluminum, stainless-steel, and brass rotary-union bodies by mass, corrosion environment, medium compatibility, strength, manufacturing, and lifecycle needs.',
      heroText: 'Select body, wetted-part, and seal materials from the medium and environment; no single metal provides the longest life in every rotary-union application.',
      opening: 'Body material is only one part of rotary-union durability. The medium may also contact shafts, sleeves, ports, fasteners, and seals, while the exterior faces humidity, washdown chemicals, dust, or salt. A useful material decision separates body, wetted parts, dynamic sealing surfaces, and elastomers instead of treating the product as one metal.',
      sections: [
        {
          heading: 'What each common body material offers',
          paragraphs: [
            'Aluminum keeps mass low and is readily machined; surface treatment and the operating environment influence corrosion and wear behavior. Stainless steel is often selected for stronger corrosion resistance or demanding cleaning environments, with greater mass, machining cost, and possible galling considerations. Brass machines well and is used in many air and water components, but compatibility still depends on fluid chemistry, temperature, and connected metals.',
            'None of these descriptions confirms compatibility by itself. Grade, heat treatment, coating, surface finish, mating materials, seal compound, and the exact medium can change the result.',
          ],
        },
        {
          heading: 'Separate the material decisions',
          points: [
            ['Body and mounting structure', 'Review mass, stiffness, thread strength, external corrosion, coating durability, and how the union attaches to the machine.'],
            ['Wetted and dynamic parts', 'List every material in contact with the medium, including shaft and sealing surfaces, and check chemical and galvanic compatibility.'],
            ['Seals and operating condition', 'Match seal compound to medium, pressure, temperature, speed, lubrication, cleanliness, and expected dwell or rotation.'],
          ],
        },
        {
          heading: 'A defensible material-selection sequence',
          ordered: true,
          points: [
            ['Define the fluids', 'Include concentration, additives, contamination, cleaning agents, temperature range, and whether the system is flushed or left filled.'],
            ['Define the environment', 'Record humidity, washdown, salt, abrasive dust, UV exposure, and contact with surrounding machine chemicals.'],
            ['Compare the complete material set', 'Review body, shaft, ports, fasteners, coatings, seals, lubricants, and connected piping as one system.'],
            ['Validate special service', 'For an unlisted medium or environment, request a material review and agree on test or inspection requirements before production use.'],
          ],
        },
      ],
      inquiryHeading: 'Review materials for a specific medium or environment',
      inquiryText: 'Send the medium and concentration, additives, pressure, temperature, speed, cleaning method, external environment, connected materials, required documentation, and annual quantity.',
    },
  },
  de: {
    'application-packaging-machinery.html': {
      metaDescription: 'Planen Sie eine pneumatische Drehdurchführung für Takt-, Füll-, Verschließ- und Siegelmaschinen anhand von Kanälen, Durchfluss, Drehzahl, Einbau und Reinigungsbedingungen.',
      heroText: 'Druckluft oder Vakuum zu rotierenden Verpackungsstationen führen, ohne Schläuche zu verdrehen oder Maschinenkreise zu vermischen.',
      opening: 'Bei Verpackungsmaschinen sitzen Pneumatikzylinder, Greifer, Sauger oder Abblasdüsen häufig auf einem rotierenden Karussell, während der Versorgungsverteiler feststeht. Eine Drehdurchführung überträgt diese Medien über die drehende Schnittstelle. Die richtige Ausführung ergibt sich aus dem Schaltplan und dem mechanischen Aufbau, nicht allein aus der Bezeichnung der Verpackungsmaschine.',
      sections: [
        {
          heading: 'Wo die Drehdurchführung in der Verpackungsmaschine sitzt',
          paragraphs: [
            'Typische Einbauorte sind Rundschalttische, Füll- und Verschließkarusselle, rotierende Siegelstationen, Etikettenhandhabungen und Produkttürme. Getrennte Kanäle können Spannen und Lösen, Vakuum und Abblasen oder mehrere unabhängig gesteuerte Aktoren versorgen.',
            'Beginnen Sie mit der Funktion jeder rotierenden Station. Ein Kreis, der Druck halten, unabhängig schalten oder vom Vakuum getrennt bleiben muss, benötigt einen eindeutig zugeordneten Kanal. Elektrische Signale, Reinigungsmedien oder weitere Dienste können separate Schnittstellen oder eine kundenspezifische Kombinationslösung erfordern.',
          ],
        },
        {
          heading: 'Drei Entscheidungen bestimmen die Ausführung',
          points: [
            ['Kreisplan', 'Jede rotierende Funktion mit Medium, Strömungsrichtung und erforderlicher Trennung von anderen Kanälen erfassen.'],
            ['Betriebsprofil', 'Normal- und Maximaldruck, erforderlichen Durchfluss, Drehzahl, Start-Stopp-Häufigkeit, Temperatur und Reinigungsumgebung angeben.'],
            ['Mechanische Integration', 'Bauraum, notwendige Zentralbohrung, feste und rotierende Seite, Befestigung, Anschlusszugang, Schlauchabstützung und Wartungsraum prüfen.'],
          ],
        },
        {
          heading: 'Praktischer Prüfablauf für Verpackungsmaschinen',
          ordered: true,
          points: [
            ['Rotierende Kreise kennzeichnen', 'Spannen, Lösen, Vakuum, Abblasen und weitere Funktionen im Pneumatikplan eindeutig benennen.'],
            ['Spitzenbedarf prüfen', 'Gleichzeitig arbeitende Funktionen einschließlich zulässigem Druckabfall am entferntesten Aktor auslegen.'],
            ['Mechanische Schnittstelle vergleichen', 'Anschlüsse, Befestigungsbild, Außenmaße, Zentralfreiraum und Schlauchführung mit dem Maschinenlayout abgleichen.'],
            ['Jeden Kanal einzeln in Betrieb nehmen', 'Mit niedrigem Druck und niedriger Drehzahl beginnen, Funktion und Leckage prüfen und danach auf den vorgesehenen Betrieb steigern.'],
          ],
        },
      ],
      inquiryHeading: 'Drehdurchführung für eine Verpackungsmaschine prüfen',
      inquiryText: 'Senden Sie Maschinenlayout, Pneumatik- oder Vakuumplan, Kanalfunktionen, Druck, Durchfluss, Drehzahl, Bauraum, Reinigungsbedingungen und Jahresmenge. Wir vergleichen Standardmodelle und klären, wo eine kundenspezifische Schnittstelle sinnvoll ist.',
    },
    'application-automation-rotary-tables.html': {
      metaDescription: 'Wählen Sie eine pneumatische Drehdurchführung für Automations-Rundtische anhand von Spann-, Löse-, Positionier-, Abblas-, Kanal-, Drehzahl-, Zentralbohrungs- und Einbaudaten.',
      heroText: 'Druckluft durch taktende oder kontinuierlich drehende Automations-Rundtische führen und jede Maschinenfunktion eindeutig getrennt halten.',
      opening: 'Automations-Rundtische können zwischen Stationen takten, für Montageprozesse anhalten oder kontinuierlich drehen. Auf der bewegten Seite werden unter anderem Spannungen, Positionierstifte, Auswerfer, Abblasung und Vorrichtungslösung pneumatisch betätigt. Die Drehdurchführung muss sowohl zur Schaltungslogik als auch zur Mechanik des Tisches passen.',
      sections: [
        {
          heading: 'Drehdurchführung und Tischzyklus aufeinander abstimmen',
          paragraphs: [
            'Ein Takt-Rundtisch und ein kontinuierlich drehender Tisch haben unterschiedliche Bewegungs- und Lastprofile. Erfassen Sie die tatsächliche Drehzahl während der Bewegung, Beschleunigungshäufigkeit, Stillstandszeit, Zyklen pro Schicht und ob der Druck im Stillstand gehalten werden muss.',
            'Zählen Sie unabhängige Funktionen und nicht nur Schläuche. Spannen und Lösen können getrennte Kanäle benötigen; mehrere gleiche Vorrichtungen dürfen nur dann einen Verteiler teilen, wenn die Maschinenschaltung dies zulässt. Eine Zentralöffnung für Kabel, Wellen oder Werkzeuge kann ebenso entscheidend sein wie die Kanalzahl.',
          ],
        },
        {
          heading: 'Schnittstellenprüfungen am Rundtisch',
          points: [
            ['Pneumatikschaltung', 'Für jeden Kanal Funktion, Strömungsrichtung, Druck, Durchfluss und zulässiges Risiko einer Kanalverbindung festlegen.'],
            ['Tischgeometrie', 'Zentralbohrung, Zentrierdurchmesser, Lochkreis, axiale Länge, Anschlussausrichtung und Zugang für Verschraubungen prüfen.'],
            ['Lasten und Ausrichtung', 'Schläuche und Verteiler separat abstützen, damit Rundlauf, Biegung oder Verdrehsicherung die Drehdurchführung nicht belasten.'],
          ],
        },
        {
          heading: 'Von der Tischzeichnung zur Modellauswahl',
          ordered: true,
          points: [
            ['Schnittzeichnung senden', 'Tischachse, feste und rotierende Bauteile, verfügbaren Bauraum sowie benachbarte Kabel oder Wellen darstellen.'],
            ['Schaltplan beilegen', 'Kennzeichnen, welche Funktionen gleichzeitig arbeiten und welche voneinander getrennt bleiben müssen.'],
            ['Realen Zyklus angeben', 'Normal- und Maximaldruck, Drehzahl, Temperatur, Starts pro Stunde und Betriebsstunden pro Tag nennen.'],
            ['Montierten Tisch prüfen', 'Nach der Ausrichtung jeden Kanal im Stillstand und bei kontrollierter Drehung testen, bevor die Produktion beginnt.'],
          ],
        },
      ],
      inquiryHeading: 'Drehdurchführung an Ihren Automations-Rundtisch anpassen',
      inquiryText: 'Senden Sie Tischschnitt, Pneumatikplan, erforderliche Zentralbohrung, Kanalfunktionen, Druck, Durchfluss, Taktzyklus oder Drehzahl, Bauraum und Stückzahl für einen Modellvergleich.',
    },
    'application-pneumatic-tools-hose-anti-twist.html': {
      metaDescription: 'Wählen Sie einen Luftdrehanschluss für Pneumatikwerkzeuge und Verdrehschutz anhand von Durchfluss, Druckabfall, Bewegung, Gewinde, Schlauchlast und Sicherheitsanforderungen.',
      heroText: 'Schlauchverdrehung an Pneumatikwerkzeugen und hängenden Arbeitsplätzen verringern, ohne Luftleistung oder sichere Handhabung zu beeinträchtigen.',
      opening: 'Ein Luftdrehanschluss ermöglicht eine Relativbewegung zwischen Druckluftschlauch und Pneumatikwerkzeug. Er kann die Handhabung verbessern und wiederholtes Verdrehen des Schlauchs verringern, ist aber nicht automatisch als schnelllaufende Drehdurchführung, Drehmomentstütze, tragendes Gelenk oder Anschlagpunkt geeignet.',
      sections: [
        {
          heading: 'Bewegung vor der Auswahl des Drehanschlusses definieren',
          paragraphs: [
            'Handwerkzeuge benötigen meist eine gelegentliche Winkelbewegung, wenn der Bediener seine Position ändert. Balancer, Schraubwerkzeuge, Aufroller und Gelenkvorrichtungen können größere oder häufigere Drehbewegungen erzeugen. Geben Sie an, ob die Verbindung pendelt, gelegentlich dreht oder kontinuierlich rotiert und ob der Schlauch seitlich zieht.',
            'Der Durchfluss ist ebenso wichtig wie die Gewindegröße. Ein kompakter Drehanschluss mit engem Innenquerschnitt kann Druckabfall verursachen, das Werkzeug verlangsamen oder das Drehmoment verändern. Verwenden Sie für die Auslegung den Luftbedarf und den Mindest-Eingangsdruck des Werkzeugherstellers.',
          ],
        },
        {
          heading: 'Prüfpunkte für Werkzeug und Schlauch',
          points: [
            ['Luftleistung', 'Versorgungsdruck, Spitzendurchfluss, Einschaltdauer, Luftqualität, Schmierung und erforderlichen Mindestdruck am Werkzeug angeben.'],
            ['Anschluss und Bewegung', 'Beide Gewindenormen, Schlauchgröße, Drehbereich, Biegeradius und Platz am Handgriff aufeinander abstimmen.'],
            ['Mechanische Sicherheit', 'Zugentlastung und Schlauchabstützung verwenden; den Drehanschluss nicht für Werkzeuggewicht, Reaktionsmoment oder das Sichern eines schlagenden Schlauchs einsetzen.'],
          ],
        },
        {
          heading: 'Verdrehschutz in der Anlage beurteilen',
          ordered: true,
          points: [
            ['Vorhandenen Schlauch prüfen', 'Beschädigte Schläuche oder Verschraubungen ersetzen, bevor Leckage oder Schwergängigkeit dem Drehanschluss zugeschrieben werden.'],
            ['Erforderliche Bewegung messen', 'Reale Werkzeugbewegung beobachten und Drehwinkel, Häufigkeit, Schlauchzug und Kollisionsstellen erfassen.'],
            ['Luftleistung und Schnittstellen prüfen', 'Druck, Durchfluss, Anschlussgewinde, Dichtmethode und Schlauchdurchmesser mit dem vorgesehenen Drehanschluss vergleichen.'],
            ['Unter normaler Handhabung testen', 'Zuerst Dichtheit prüfen, danach freie Bewegung, Werkzeugdruck und Schlauchverhalten über den vollständigen Arbeitszyklus kontrollieren.'],
          ],
        },
      ],
      inquiryHeading: 'Anwendung für einen Luftdrehanschluss prüfen',
      inquiryText: 'Senden Sie Werkzeugmodell, Luftverbrauch, Versorgungsdruck, Gewinde- und Schlauchgrößen, Bewegungsablauf, Fotos des Anschlusses und Jahresmenge. Wir prüfen eine Standardausführung oder eine kompakte kundenspezifische Schnittstelle.',
    },
    'application-robot-end-of-arm-tooling.html': {
      metaDescription: 'Planen Sie eine pneumatische Drehdurchführung für Roboter-Endeffektoren anhand von Greifern, Vakuum, Abblasung, Handgelenkbewegung, Nutzlast, Schlauchführung und Schnittstellen.',
      heroText: 'Pneumatikgreifer, Sauger, Abblasung und weitere Endeffektorfunktionen durch ein drehendes Roboterhandgelenk versorgen, ohne Schläuche unkontrolliert aufzuwickeln.',
      opening: 'Roboter-Endeffektoren können Greifer, Vakuumkreise, Abblasung, Werkzeugwechsler und Sensoren in einem kleinen bewegten Bauraum kombinieren. Eine Drehdurchführung kann pneumatische Medien durch eine Drehachse übertragen; Kanalbelegung, Handgelenkbewegung, Nutzlast und Werkzeugschnittstelle müssen jedoch gemeinsam geprüft werden.',
      sections: [
        {
          heading: 'Medien und Funktionen am Roboterhandgelenk erfassen',
          paragraphs: [
            'Listen Sie jeden Greifer, jede Vakuumzone, Löseleitung, Spülleitung und Abblasfunktion auf. Kennzeichnen Sie gleichzeitig arbeitende Funktionen und solche, die getrennt bleiben müssen. Kreise dürfen nicht allein deshalb zusammengelegt werden, weil sie denselben Versorgungsdruck nutzen.',
            'Elektrische Leistung, Sensorsignale, Daten, Kühlmittel oder Hydraulik benötigen jeweils kompatible Schnittstellen. Eine pneumatische Drehdurchführung kann Teil einer Kombinationsbaugruppe sein; elektrische und weitere Medienanforderungen müssen jedoch getrennt spezifiziert und dürfen nicht aus der Luftkanalzahl abgeleitet werden.',
          ],
        },
        {
          heading: 'Faktoren für die Roboterintegration',
          points: [
            ['Bewegung und Lastprofil', 'Achsdrehbereich, Höchstdrehzahl, Beschleunigung, Umkehrungen, Zyklen pro Stunde und erforderliche Endlosdrehung angeben.'],
            ['Nutzlast und Bauraum', 'Masse der Drehdurchführung, Werkzeugschwerpunkt, Trägheitsgrenzen, Zentralbohrung, Handgelenk-Lochbild und Kollisionsraum berücksichtigen.'],
            ['Leitungsführung und Wartung', 'Schläuche abstützen, Biegeradien einhalten, Quetschstellen vermeiden und Zugang zu Verschraubungen und Austauschstellen freihalten.'],
          ],
        },
        {
          heading: 'Sinnvolle Unterlagen für die EOAT-Auswahl',
          ordered: true,
          points: [
            ['Handgelenk- und Werkzeugzeichnungen senden', 'Roboterflansch, Werkzeugplatte, Achse, Aufbaumaße und verfügbaren Raum darstellen.'],
            ['Medienplan senden', 'Medium, Druck, Durchfluss, Kanalfunktion, Ventilposition und gleichzeitigen Bedarf auflisten.'],
            ['Bewegungsprofil senden', 'Achswinkel, Drehzahl, Beschleunigung, Umkehrungen, Zykluszeit und geplante Betriebsstunden angeben.'],
            ['Am Roboter validieren', 'Leckage, Schlauchverhalten, Kollisionsraum, Nutzlastdaten und jede Werkzeugfunktion bei reduzierter Geschwindigkeit prüfen.'],
          ],
        },
      ],
      inquiryHeading: 'Roboterhandgelenk oder EOAT-Schnittstelle prüfen',
      inquiryText: 'Senden Sie Robotermodell, Handgelenk- und Werkzeugzeichnungen, Pneumatikplan, Kanalfunktionen, Druck, Durchfluss, Bewegungsprofil, Nutzlastgrenzen, weitere Medien und Jahresmenge.',
    },
    'blog-rotary-joint-leaking.html': {
      metaDescription: 'Diagnostizieren Sie eine undichte Drehdurchführung durch Leckortung, Trennung von Verschraubungs- und Dichtfehlern sowie Prüfung von Ausrichtung, Betrieb und einzelnen Kanälen.',
      heroText: 'Mit einem kontrollierten Prüfablauf Schlauch-, Verschraubungs-, statische Dichtungs-, Rotordichtungs- und Kanalfehler unterscheiden, bevor Teile ersetzt werden.',
      opening: 'Eine sichtbare Luft- oder Flüssigkeitsleckage bedeutet nicht automatisch, dass die innere Rotordichtung ausgefallen ist. Lose Verschraubungen, beschädigte Schläuche, verschmutzte Dichtflächen, Seitenlast, Fluchtfehler, zu hohe Betriebsbedingungen oder eine Kanalverbindung können ähnlich wirken. Sichern Sie die Maschine und bestimmen Sie den Leckort vor der Demontage.',
      sections: [
        {
          heading: 'Mit Leckort und Zeitpunkt beginnen',
          paragraphs: [
            'Beobachten Sie, ob die Leckage an einem Schlauchanschluss, einer statischen Gehäusefuge, der rotierenden Schnittstelle, einem Ablauf oder einem anderen Kanal austritt. Notieren Sie, ob sie im Stillstand, nur bei Drehung, nach Erwärmung oder nur bei Druckbeaufschlagung eines bestimmten Kreises auftritt.',
            'Diese Beobachtungen grenzen die Ursache ein. Eine Verschraubungsleckage lässt sich häufig ohne Öffnen der Drehdurchführung beheben. Ändert sich die Leckage mit Drehzahl, Wellenposition, Temperatur oder Schlauchbewegung, sind Ausrichtung, äußere Last, Oberflächenzustand oder dynamische Dichtung zu prüfen.',
          ],
        },
        {
          heading: 'Häufige Ursachen prüfen',
          points: [
            ['Äußere Anschlüsse', 'Schlauchenden, Klemmringe, Gewinde, Dichtmethode, Adapter und Anzug innerhalb der Verschraubungsvorgaben prüfen.'],
            ['Einbauzustand', 'Konzentrizität, Rundlauf, starre Verrohrung, Schlauchzug, Biegelast, Verdrehsicherung und Verschmutzung an der Drehstelle prüfen.'],
            ['Betriebszustand', 'Tatsächliches Medium, Druck, Drehzahl, Temperatur, Lastprofil, Filtration und Schmierung mit der gewählten Ausführung vergleichen.'],
          ],
        },
        {
          heading: 'Ablauf zur Leckdiagnose',
          ordered: true,
          points: [
            ['Maschine sichern', 'Drehung stoppen, alle Energiequellen sperren, sämtliche Kanäle drucklos machen und den Bereich reinigen.'],
            ['Äußere Verbindungen testen', 'Jeweils einen Kanal kontrolliert beaufschlagen und Schläuche sowie Verschraubungen mit einem geeigneten Lecksuchverfahren prüfen.'],
            ['Stillstand und Drehung trennen', 'Leckage im Stillstand und bei langsamer Drehung erfassen, ohne veröffentlichte Grenzwerte zu überschreiten.'],
            ['Vor dem Dichtungswechsel prüfen', 'Bei innerer Leckage Welle, Dichtflächen, Lager, Verschmutzung und Ausrichtung kontrollieren; eine neue Dichtung behebt keine beschädigte Hardware.'],
            ['Jeden Kanal erneut testen', 'Nach der Reparatur Kanaltrennung und Dichtheit bei niedrigem Druck und niedriger Drehzahl prüfen, bevor der Normalbetrieb beginnt.'],
          ],
        },
      ],
      inquiryHeading: 'Unterstützung bei der Leckdiagnose anfragen',
      inquiryText: 'Senden Sie Modell, Leckort, Fotos oder Video, Medium, Druck, Drehzahl, Temperatur, Lastprofil, Einbauzeichnung, Betriebsstunden und die Änderung unmittelbar vor Auftreten der Leckage.',
    },
    'blog-seal-replacement.html': {
      metaDescription: 'Dichtungen einer Drehdurchführung sicher ersetzen: Fehler bestätigen, richtigen Dichtsatz verwenden, Bauteile prüfen, sauber montieren und jeden Kanal erneut in Betrieb nehmen.',
      heroText: 'Zuerst bestätigen, dass die Dichtung die Ursache ist; danach Dichtflächen schützen und die reparierte Drehdurchführung vor Wiederinbetriebnahme prüfen.',
      opening: 'Ein Dichtungswechsel kann eine instandsetzbare Drehdurchführung wiederherstellen, ist aber kein allgemeines Mittel gegen jede Leckage. Eine eingelaufene Welle, verschlissene Lager, korrodierte Dichtflächen, falsches Medium, Seitenlast oder eine beschädigte Verschraubung kann auch eine neue Dichtung erneut undicht werden lassen. Diagnostizieren Sie die Baugruppe und beschaffen Sie den modellspezifischen Dichtsatz vor dem Öffnen.',
      sections: [
        {
          heading: 'Prüfen, ob ein Dichtungswechsel sinnvoll ist',
          paragraphs: [
            'Bestimmen Sie genaues Modell und Revision, lokalisieren Sie die Leckage und vergleichen Sie den Betrieb mit der gewählten Ausführung. Prüfen Sie zuerst äußere Anschlüsse und Einbauflucht. Sind Gehäuse, Welle, Lager oder Dichtlaufbahn beschädigt, kann die Reparatur oder der Austausch der kompletten Baugruppe zuverlässiger sein als ein reiner Dichtungswechsel.',
            'Dichtungswerkstoff und Geometrie müssen zu Medium, Druck, Temperatur, Drehzahl und Gegenfläche passen. Ersetzen Sie O-Ringe oder dynamische Dichtungen nicht durch optisch ähnliche Teile, ohne Abmessungen und Materialverträglichkeit zu klären.',
          ],
        },
        {
          heading: 'Vorbereitung gegen erneute Leckage',
          points: [
            ['Richtige Teile', 'Dichtsatz, Montagezeichnung, Werkzeuge, Schmierstoff und Anzugsvorgaben für die genaue Ausführung verwenden.'],
            ['Sauberer Arbeitsplatz', 'Fasern, Späne, Schleifstaub, beschädigte Montagehaken und nicht freigegebene Reiniger von Dichtungen und Dichtflächen fernhalten.'],
            ['Prüfkriterien', 'Wellen, Nuten, Dichtlaufbahnen, Lager, Gewinde und Anschlüsse auf Verschleiß, Korrosion, Grate, Riefen und eingebettete Partikel prüfen.'],
          ],
        },
        {
          heading: 'Dichtungswechsel und Wiederinbetriebnahme',
          ordered: true,
          points: [
            ['Sichern und dokumentieren', 'Maschine sperren, alle Kanäle drucklos machen, Orientierung markieren und Leitungsführung sowie Bauteilfolge fotografieren.'],
            ['Ohne Kratzer demontieren', 'Vorgesehene Werkzeuge nutzen, Präzisionsflächen schützen und nicht über eine Dichtlaufbahn hebeln.'],
            ['Reinigen und prüfen', 'Rückstände ohne Maßänderung entfernen und anschließend die Wiederverwendbarkeit der Hardware beurteilen.'],
            ['Verdrehungsfrei einsetzen', 'Nur wie vorgegeben schmieren, Dichtlippen vor Gewinden und scharfen Kanten schützen und korrekten Sitz prüfen.'],
            ['Nach richtigen Daten montieren', 'Orientierung, Befestigungen, Verschraubungen und Verdrehsicherung nach Modell- und Anschlussvorgaben wiederherstellen.'],
            ['Stufenweise testen', 'Jeden Kanal bei niedrigem Druck auf Trennung und Leckage prüfen, danach langsam drehen und Last unter Beobachtung von Temperatur und Reibung steigern.'],
          ],
        },
      ],
      inquiryHeading: 'Geeigneten Reparaturweg für die Dichtung bestimmen',
      inquiryText: 'Senden Sie Modell, vorhandene Serien- oder Revisionsangabe, Medium, Druck, Drehzahl, Leckort, Fotos der ausgebauten Teile sowie den Zustand von Welle und Dichtfläche.',
    },
    'blog-threaded-vs-flange.html': {
      metaDescription: 'Vergleichen Sie Gewinde- und Flansch-Drehdurchführungen anhand von Bauraum, Ausrichtung, Verdrehsicherung, Rohrlast, Montagezugang und Wartung.',
      heroText: 'Die Befestigung aus Maschinenstruktur und Wartungsplan wählen, nicht allein nach dem äußeren Erscheinungsbild der Drehdurchführung.',
      opening: 'Drehdurchführungen mit Gewinde oder Flansch können beide zuverlässig arbeiten, wenn die Schnittstelle richtig konstruiert ist. Die bessere Wahl hängt von Bauraum, Zentrierung, Lastpfad, Anschlusszugang, Ausbauablauf und der Abstützung der festen und rotierenden Seite ab.',
      sections: [
        {
          heading: 'Unterschiede der beiden Befestigungsarten',
          paragraphs: [
            'Ein Gewindeanschluss kann kompakt und direkt sein; Gewindeeingriff, Dichtmethode, Montagedrehmoment, Orientierung und Ausbauzugang sind jedoch zu berücksichtigen. Die Umgebungskonstruktion muss verhindern, dass Schläuche oder Verschraubungen Biege- oder Torsionslasten einleiten.',
            'Ein Flansch kann Lochbild und Zentrierung eindeutig definieren und damit Ausrichtung und wiederholten Ausbau erleichtern. Er benötigt meist mehr radialen Raum und eine geeignete Gegenfläche. Ein Flansch korrigiert weder mangelnde Konzentrizität noch ersetzt er Schlauchabstützung und Verdrehsicherung.',
          ],
        },
        {
          heading: 'Diese Faktoren auf Maschinenebene vergleichen',
          points: [
            ['Ausrichtung und Lastpfad', 'Festlegen, wie die Drehachse geführt wird und wie Axial-, Radial-, Biege- und Torsionslasten von der Drehdurchführung ferngehalten werden.'],
            ['Montage- und Wartungszugang', 'Werkzeugraum, Zugang zu Verschraubungen, Orientierung, Austauschzeit und notwendige Demontage benachbarter Bauteile prüfen.'],
            ['Schnittstellendefinition', 'Gewindenorm und Eingriff oder Flanschzentrierung, Lochbild, Schrauben, Dichtfläche, Toleranzen sowie feste und rotierende Seite angeben.'],
          ],
        },
        {
          heading: 'Praktischer Entscheidungsablauf für die Befestigung',
          ordered: true,
          points: [
            ['Beide Schnittstellen im Schnitt zeichnen', 'Maschinenwelle, Gehäuse, Drehdurchführung, Verschraubungen, Schläuche, Abstützungen und Ausbaurichtung darstellen.'],
            ['Montagetoleranzen prüfen', 'Konzentrizität, Rundlauf, Zentrierungen, Gewinde- oder Flanschtoleranzen und Wärmebewegung bewerten.'],
            ['Wartungsablauf prüfen', 'Klären, wie Techniker absperren, zugreifen, ausbauen, wieder montieren und die Dichtheit prüfen.'],
            ['Nach dem gesamten Integrationsrisiko wählen', 'Die Schnittstelle wählen, die Ausrichtung und äußere Lasten mit wenigen Sonderteilen und einem klaren Wartungsablauf beherrscht.'],
          ],
        },
      ],
      inquiryHeading: 'Gewinde- und Flanschschnittstelle für Ihre Maschine vergleichen',
      inquiryText: 'Senden Sie eine Schnittzeichnung von Welle und Gehäuse, Bauraum, feste und rotierende Seite, Drehzahl, Druck, Anschlussrichtung, Schlauchführung, Wartungszugang und Jahresmenge.',
    },
    'blog-rotary-joint-materials.html': {
      metaDescription: 'Vergleichen Sie Aluminium, Edelstahl und Messing für Drehdurchführungen anhand von Masse, Korrosion, Medienverträglichkeit, Festigkeit, Fertigung und Lebenszyklus.',
      heroText: 'Gehäuse-, medienberührte und Dichtungswerkstoffe aus Medium und Umgebung ableiten; kein Metall bietet in jeder Anwendung die längste Lebensdauer.',
      opening: 'Der Gehäusewerkstoff ist nur ein Teil der Haltbarkeit einer Drehdurchführung. Das Medium kann außerdem Wellen, Hülsen, Anschlüsse, Befestigungen und Dichtungen berühren, während die Außenseite Feuchtigkeit, Reinigungschemikalien, Staub oder Salz ausgesetzt ist. Eine brauchbare Werkstoffentscheidung trennt Gehäuse, medienberührte Teile, dynamische Dichtflächen und Elastomere.',
      sections: [
        {
          heading: 'Eigenschaften gängiger Gehäusewerkstoffe',
          paragraphs: [
            'Aluminium reduziert die Masse und lässt sich gut bearbeiten; Oberflächenbehandlung und Umgebung beeinflussen Korrosion und Verschleiß. Edelstahl wird häufig für erhöhte Korrosionsbeständigkeit oder anspruchsvolle Reinigung gewählt, bringt aber mehr Masse, Bearbeitungskosten und mögliche Fressneigung mit. Messing ist gut zerspanbar und in vielen Luft- und Wasserbauteilen verbreitet; die Verträglichkeit hängt dennoch von Fluidchemie, Temperatur und verbundenen Metallen ab.',
            'Keine dieser Aussagen bestätigt allein die Verträglichkeit. Werkstoffsorte, Wärmebehandlung, Beschichtung, Oberfläche, Gegenwerkstoffe, Dichtungsmischung und das genaue Medium können das Ergebnis verändern.',
          ],
        },
        {
          heading: 'Werkstoffentscheidungen getrennt betrachten',
          points: [
            ['Gehäuse und Befestigungsstruktur', 'Masse, Steifigkeit, Gewindefestigkeit, äußere Korrosion, Beschichtungsbeständigkeit und Maschinenbefestigung prüfen.'],
            ['Medienberührte und dynamische Teile', 'Alle medienberührten Werkstoffe einschließlich Welle und Dichtflächen erfassen sowie chemische und galvanische Verträglichkeit prüfen.'],
            ['Dichtungen und Betrieb', 'Dichtungswerkstoff auf Medium, Druck, Temperatur, Drehzahl, Schmierung, Sauberkeit und Stillstands- oder Drehbetrieb abstimmen.'],
          ],
        },
        {
          heading: 'Nachvollziehbarer Ablauf zur Werkstoffwahl',
          ordered: true,
          points: [
            ['Fluide definieren', 'Konzentration, Zusätze, Verunreinigung, Reinigungsmittel, Temperaturbereich und Spül- oder Füllzustand angeben.'],
            ['Umgebung definieren', 'Feuchtigkeit, Reinigung, Salz, abrasiven Staub, UV-Belastung und Kontakt mit Maschinenchemikalien erfassen.'],
            ['Kompletten Werkstoffsatz vergleichen', 'Gehäuse, Welle, Anschlüsse, Befestigungen, Beschichtungen, Dichtungen, Schmierstoffe und Rohrleitungen als System prüfen.'],
            ['Sonderbetrieb validieren', 'Für nicht aufgeführte Medien oder Umgebungen vor Serieneinsatz eine Werkstoffprüfung sowie Prüf- oder Inspektionsanforderungen vereinbaren.'],
          ],
        },
      ],
      inquiryHeading: 'Werkstoffe für ein bestimmtes Medium oder eine Umgebung prüfen',
      inquiryText: 'Senden Sie Medium und Konzentration, Zusätze, Druck, Temperatur, Drehzahl, Reinigungsverfahren, äußere Umgebung, verbundene Werkstoffe, erforderliche Dokumente und Jahresmenge.',
    },
  },
  ja: {
    'application-packaging-machinery.html': {
      metaDescription: '包装機械用エアロータリージョイントを、流路、流量、回転数、取付、洗浄条件に基づいて選定するための実務ガイドです。',
      heroText: 'ホースのねじれや回路間の混線を防ぎながら、回転する包装工程へ圧縮空気や真空を供給します。',
      opening: '包装機械では、固定側のマニホールドから、回転カルーセル上のエアシリンダ、グリッパ、吸着パッド、ブロー用ノズルへ流体を供給する場合があります。ロータリージョイントは、この固定側と回転側の間で流体を伝達します。適切な仕様は「包装機」という名称だけではなく、装置の回路と機械レイアウトから決まります。',
      sections: [
        {
          heading: '包装機械でロータリージョイントを使用する位置',
          paragraphs: [
            '代表例は、インデックステーブル、充填・キャッピング用カルーセル、回転シール工程、ラベル搬送機構、製品移載タレットです。独立した流路で、クランプと解除、真空とブロー、または複数のアクチュエータを個別に制御できます。',
            'まず各回転ステーションの機能を整理します。圧力保持、独立切替、または真空回路との分離が必要な機能には、役割を明確にした専用流路が必要です。電気信号、洗浄液、その他のサービスには、別のインターフェースまたは複合仕様が必要になる場合があります。',
          ],
        },
        {
          heading: '仕様を決める3つの判断項目',
          points: [
            ['回路構成', '回転側の各機能について、流体、流れ方向、他流路から分離する必要性を整理します。'],
            ['運転条件', '通常・最大圧力、必要流量、回転数、起動停止頻度、温度、洗浄環境を提示します。'],
            ['機械インターフェース', '外形スペース、中空穴の要否、固定側と回転側、取付部、ポート作業性、配管支持、保守スペースを確認します。'],
          ],
        },
        {
          heading: '包装機械での実用的な確認手順',
          ordered: true,
          points: [
            ['回転側の回路を表示する', 'クランプ、解除、真空、ブロー、その他の機能を空圧図上で明確に区別します。'],
            ['最大需要を確認する', '同時に動作する機能と、最遠端アクチュエータで許容される圧力低下を考慮して流量を決めます。'],
            ['機械寸法を照合する', 'ポート、取付パターン、外形、中空部、ホース経路を装置レイアウトと照合します。'],
            ['流路ごとに試運転する', '低圧・低速から開始し、機能と漏れを確認してから予定運転条件まで段階的に上げます。'],
          ],
        },
      ],
      inquiryHeading: '包装機械用ロータリージョイントを検討する',
      inquiryText: '装置レイアウト、空圧または真空回路図、各流路の機能、圧力、流量、回転数、取付スペース、洗浄条件、年間数量をお送りください。標準型式を比較し、特注インターフェースが有効な箇所を整理します。',
    },
    'application-automation-rotary-tables.html': {
      metaDescription: '自動化用回転テーブルのクランプ、解除、位置決め、ブロー、流路、回転数、中空穴、取付条件からエアロータリージョイントを選定します。',
      heroText: 'インデックス式または連続回転式の自動化テーブルへ圧縮空気を供給し、各装置機能を明確に分離します。',
      opening: '自動化用回転テーブルには、工程間を間欠移動するもの、組立中に停止するもの、連続回転するものがあります。回転側では、クランプ、位置決めピン、排出、ブロー、治具解除などを空圧で行います。ロータリージョイントは、回路ロジックとテーブルの機械構造の両方に適合させる必要があります。',
      sections: [
        {
          heading: 'テーブルの運転サイクルに合わせる',
          paragraphs: [
            'インデックス停止式と連続回転式では、動きと負荷条件が異なります。移動中の実回転数、加速頻度、停止時間、シフト当たりのサイクル数、停止中に圧力保持が必要かを記録します。',
            'ホース本数ではなく、独立して制御する機能数を数えます。クランプと解除には別流路が必要な場合があります。同一治具を一つのマニホールドにまとめられるのは、装置回路で許容される場合だけです。ケーブル、軸、治具用の中空穴は、流路数と同じくらい重要になることがあります。',
          ],
        },
        {
          heading: '回転テーブルのインターフェース確認',
          points: [
            ['空圧回路', '各流路の機能、流れ方向、圧力、流量、流路間連通に対する許容範囲を定義します。'],
            ['テーブル形状', '中空径、インロー径、ボルトパターン、軸方向長さ、ポート方向、継手の作業スペースを確認します。'],
            ['荷重と芯出し', 'テーブルの振れ、曲げ、回り止め部品の力がロータリージョイントへ伝わらないよう、ホースとマニホールドを別に支持します。'],
          ],
        },
        {
          heading: 'テーブル図面から型式を選ぶ手順',
          ordered: true,
          points: [
            ['断面図を共有する', 'テーブル中心、固定部と回転部、使用可能な外形、近接するケーブルや軸を示します。'],
            ['回路図を添付する', '同時に動作する機能と、互いに分離する必要がある機能を明示します。'],
            ['実際のサイクルを示す', '通常・最大圧力、回転数、温度、1時間当たりの起動回数、1日当たりの運転時間を記載します。'],
            ['組立後に確認する', '芯出し後、停止状態と制御回転中の両方で各流路を試験してから量産運転へ移行します。'],
          ],
        },
      ],
      inquiryHeading: '自動化用回転テーブルに合う型式を検討する',
      inquiryText: 'テーブル断面図、空圧回路図、必要中空径、各流路の機能、圧力、流量、インデックスサイクルまたは回転数、取付スペース、数量をお送りください。',
    },
    'application-pneumatic-tools-hose-anti-twist.html': {
      metaDescription: '空圧工具とホースねじれ防止用エアスイベルを、流量、圧力低下、動き、ねじ、ホース荷重、安全条件から選定します。',
      heroText: '空圧工具や吊下げ作業場で、空気性能と安全な操作性を保ちながらホースのねじれを抑えます。',
      opening: 'エアスイベルは、圧縮空気ホースと空圧工具の間で相対運動を可能にします。操作性を改善し、繰り返すホースのねじれを低減できますが、高速回転用ロータリージョイント、反力受け、構造継手、吊り点として自動的に使用できるものではありません。',
      sections: [
        {
          heading: 'スイベル選定前に動きを定義する',
          paragraphs: [
            '手持ち工具では、作業者が姿勢を変える際の断続的な角度変化が一般的です。バランサ、締付工具、リール、関節治具では、より大きい角度や高頻度の回転が発生します。揺動、時々の回転、連続回転のどれか、またホースから横引き荷重がかかるかを明確にします。',
            'ねじサイズと同様に流量も重要です。内部流路が狭い小型スイベルでは圧力低下が生じ、工具速度や締付トルクに影響する場合があります。工具メーカーが示す空気消費量と最低入口圧力を使って流路を検討します。',
          ],
        },
        {
          heading: '工具・ホース用途の確認項目',
          points: [
            ['空気性能', '供給圧力、ピーク流量、使用率、空気品質、給油方法、工具入口で必要な最低圧力を提示します。'],
            ['接続と動き', '両側のねじ規格、ホース径、回転範囲、曲げ半径、作業者のグリップ周辺スペースを合わせます。'],
            ['機械安全', 'ストレインリリーフとホース支持を使用し、スイベルで工具重量、締付反力、暴れるホースを受けないようにします。'],
          ],
        },
        {
          heading: 'ねじれ防止取付の評価手順',
          ordered: true,
          points: [
            ['既設ホースを点検する', '漏れや動きの重さをスイベルの問題と判断する前に、損傷したホースや継手を交換します。'],
            ['必要な動きを測る', '実際の工具動作を観察し、回転角度、頻度、ホース張力、干渉位置を記録します。'],
            ['空気性能と接続を確認する', '圧力、流量、ポートねじ、シール方法、ホース径を候補スイベルと比較します。'],
            ['通常操作で試験する', '最初に漏れを確認し、その後、全作業サイクルで自由な動き、工具入口圧力、ホース挙動を確認します。'],
          ],
        },
      ],
      inquiryHeading: 'エアスイベル用途を検討する',
      inquiryText: '工具型式、空気消費量、供給圧力、ねじとホースサイズ、動作パターン、接続部写真、年間数量をお送りください。標準スイベルまたは小型特注インターフェースを検討します。',
    },
    'application-robot-end-of-arm-tooling.html': {
      metaDescription: 'ロボットEOAT用エアロータリージョイントを、グリッパ、真空、ブロー、手首動作、可搬質量、配管、取付条件から検討します。',
      heroText: 'ホースを無制御に巻き付けず、回転するロボット手首を介してグリッパ、吸着、ブローなどの機能へ空気を供給します。',
      opening: 'ロボットのエンドエフェクタには、狭い可動空間にグリッパ、真空回路、ブロー、ツールチェンジャ、センサを組み込む場合があります。ロータリージョイントで回転軸を介して空圧サービスを供給できますが、流路構成、手首動作、可搬質量、ツールインターフェースを一体で検討する必要があります。',
      sections: [
        {
          heading: 'ロボット手首のサービスを整理する',
          paragraphs: [
            '各グリッパ、真空ゾーン、解除回路、パージ、ブロー機能を一覧化します。同時に動作する機能と、分離を維持する機能を区別します。同じ供給圧力を使うという理由だけで回路を統合してはいけません。',
            '電源、センサ信号、データ、冷却液、油圧には、それぞれ適合する別インターフェースが必要です。空圧ロータリージョイントを複合ユニットの一部にできますが、電気および他流体の要件は空気流路数から推定せず、個別に仕様化します。',
          ],
        },
        {
          heading: 'ロボット統合時の判断項目',
          points: [
            ['動作と使用率', '軸回転範囲、最高回転数、加速度、反転、1時間当たりのサイクル、無制限回転の要否を示します。'],
            ['可搬質量と外形', 'ジョイント質量、ツール重心、慣性制限、中空穴、手首ボルトパターン、干渉スペースを含めます。'],
            ['配管と保守性', 'ホースを支持し、曲げ半径を確保し、挟み込みを防ぎ、継手と交換作業へのアクセスを残します。'],
          ],
        },
        {
          heading: 'EOAT選定に必要な情報',
          ordered: true,
          points: [
            ['手首・ツール図面を提示する', 'ロボットフランジ、ツールプレート、中心軸、取付積層、使用可能スペースを示します。'],
            ['サービス表を提示する', '流体、圧力、流量、流路機能、バルブ位置、同時需要を一覧化します。'],
            ['動作プロファイルを提示する', '軸範囲、回転数、加速度、反転、サイクル時間、予定運転時間を記載します。'],
            ['実機で検証する', '低速で漏れ、ホース挙動、干渉、可搬質量データ、各ツール機能を確認してから量産速度へ上げます。'],
          ],
        },
      ],
      inquiryHeading: 'ロボット手首・EOATインターフェースを検討する',
      inquiryText: 'ロボット型式、手首・ツール図面、空圧回路、流路機能、圧力、流量、動作プロファイル、可搬質量制限、その他のサービス、年間数量をお送りください。',
    },
    'blog-rotary-joint-leaking.html': {
      metaDescription: 'ロータリージョイントの漏れ位置を特定し、継手・シール不良、芯ずれ、運転条件を切り分け、安全に各流路を診断する手順です。',
      heroText: '部品交換前に、ホース、継手、固定シール、回転シール、流路間漏れを順序立てて切り分けます。',
      opening: '空気や流体が見える場所に漏れていても、内部の回転シールが必ず故障しているとは限りません。継手の緩み、配管損傷、シール面の異物、横荷重、芯ずれ、過大な運転条件、流路間漏れでも似た症状が発生します。分解前に装置を安全状態にし、漏れ位置を特定します。',
      sections: [
        {
          heading: '漏れ位置と発生タイミングから始める',
          paragraphs: [
            'ホース接続部、固定側のボディ接合部、回転部、ドレンまたはベント、別流路のどこから漏れているかを観察します。停止中、回転時のみ、温度上昇後、特定回路の加圧時のみのどれかも記録します。',
            'この情報で原因を絞れます。継手漏れなら、ジョイント本体を開けずに修正できる場合があります。回転数、軸位置、温度、ホース動作で漏れ量が変わる場合は、芯出し、外力、表面状態、動的シールを確認します。',
          ],
        },
        {
          heading: '確認すべき代表的な原因',
          points: [
            ['外部接続', 'チューブ端面、フェルール、ねじ状態、シール方法、アダプタ、継手仕様内の締付を点検します。'],
            ['取付状態', '同心度、軸振れ、剛性配管、ホース張力、曲げ荷重、回り止め、回転部周辺の異物を点検します。'],
            ['運転条件', '実際の流体、圧力、回転数、温度、使用率、ろ過、給油を選定仕様と比較します。'],
          ],
        },
        {
          heading: '漏れ診断の順序',
          ordered: true,
          points: [
            ['装置を安全状態にする', '回転を停止し、全エネルギー源を遮断し、全流路を完全に減圧して周辺を清掃します。'],
            ['外部接続を試験する', '流路を一つずつ制御加圧し、適切な漏れ検知方法でホースと継手を確認します。'],
            ['停止時と回転時を分ける', '公開上限を超えず、停止時と低速回転時の漏れをそれぞれ記録します。'],
            ['シール交換前に内部を確認する', '内部漏れなら、軸、シール面、軸受、異物、芯出しを確認します。損傷した部品は新品シールだけでは直りません。'],
            ['全流路を再試験する', '修理後、低圧・低速で流路間分離と漏れを確認してから通常運転へ戻します。'],
          ],
        },
      ],
      inquiryHeading: 'ロータリージョイントの漏れ診断を依頼する',
      inquiryText: '型式、漏れ位置、写真または動画、流体、圧力、回転数、温度、使用率、取付図、運転時間、漏れ発生前に変わった点をお送りください。',
    },
    'blog-seal-replacement.html': {
      metaDescription: 'ロータリージョイントの故障確認、正しいシールセット、部品点検、清浄組立、流路別試運転までを含む安全なシール交換手順です。',
      heroText: 'シールが本当の原因か確認し、シール面を保護して、修理後のロータリージョイントを再稼働前に検証します。',
      opening: 'シール交換で修理可能なロータリージョイントを復旧できる場合がありますが、すべての漏れを直せるわけではありません。軸の傷、軸受摩耗、シール面腐食、不適合流体、横荷重、継手損傷があると、新しいシールでも再び漏れます。分解前に原因を診断し、型式専用の正しいシールセットを準備します。',
      sections: [
        {
          heading: 'シール交換が適切か判断する',
          paragraphs: [
            '正確な型式と改訂を確認し、漏れ位置を特定して、実際の運転条件を選定仕様と比較します。まず外部継手と取付芯を点検します。ボディ、軸、軸受、シール摺動面が損傷している場合は、シールだけでなく本体修理または全体交換の方が確実な場合があります。',
            'シール材質と形状は、流体、圧力、温度、回転数、相手面に適合させます。寸法と材質適合性を確認せず、見た目が似たOリングや回転シールで代用しないでください。',
          ],
        },
        {
          heading: '再漏れを防ぐ準備',
          points: [
            ['正しい部品', '正確な仕様に対応するシールキット、組立図、工具、潤滑剤、締付データを使用します。'],
            ['清浄な作業場所', '糸くず、切粉、研磨粉、損傷したピック、未承認洗浄剤をシールとシール面に近づけません。'],
            ['点検基準', '軸、溝、シール面、軸受、ねじ、ポートの摩耗、腐食、ばり、傷、埋込み異物を確認します。'],
          ],
        },
        {
          heading: 'シール交換と再試運転の手順',
          ordered: true,
          points: [
            ['隔離して記録する', '装置をロックアウトし、全流路を減圧し、向きをマーキングして配管と部品順序を撮影します。'],
            ['傷を付けずに分解する', '指定工具を使い、精密面を保護し、シール摺動面を支点にしてこじらないようにします。'],
            ['清掃して点検する', '寸法を変えずに残留物を除去し、部品を再使用できるか判断します。'],
            ['ねじらずに組み込む', '指定された場合のみ潤滑し、ねじや鋭利な縁からシールリップを保護し、正しい着座を確認します。'],
            ['正しいデータで再組立する', '型式と継手の条件に従い、向き、締結、継手、回り止め支持を復元します。'],
            ['段階的に試験する', '低圧で各流路の分離と漏れを確認し、低速回転から開始して温度と摩擦を監視しながら負荷を上げます。'],
          ],
        },
      ],
      inquiryHeading: '適切なシール修理方法を確認する',
      inquiryText: 'ロータリージョイント型式、分かる場合は製造番号や改訂、流体、圧力、回転数、漏れ位置、取り外した部品の写真、軸とシール面の状態をお送りください。',
    },
    'blog-threaded-vs-flange.html': {
      metaDescription: 'ねじ取付とフランジ取付のロータリージョイントを、外形、芯出し、回り止め、配管荷重、作業性、保守性から比較します。',
      heroText: '外観だけでなく、装置構造と保守計画に基づいてロータリージョイントの取付方式を選びます。',
      opening: 'ねじ取付とフランジ取付のどちらも、インターフェースを正しく設計すれば安定した回転供給が可能です。適切な方式は、使用可能スペース、芯出し方法、荷重経路、継手へのアクセス、取り外し手順、固定側と回転側の支持方法で決まります。',
      sections: [
        {
          heading: '2つの取付方式の違い',
          paragraphs: [
            'ねじ接続は小型で直接的にできますが、ねじかかり長さ、シール方法、取付トルク、向き、取り外し工具のスペースが重要です。周辺構造で、ホースや継手から曲げ・ねじり荷重がジョイントに入らないようにします。',
            'フランジはボルトパターンと位置決め部を明確にでき、向きの再現や交換を容易にする場合があります。一方で径方向スペースと適切な相手面が必要です。フランジでも芯ずれは補正できず、ホース支持と回り止め管理は必要です。',
          ],
        },
        {
          heading: '装置全体で比較する項目',
          points: [
            ['芯出しと荷重経路', '回転軸の位置決め方法と、軸方向、径方向、曲げ、ねじり荷重をジョイントから分離する方法を決めます。'],
            ['組立・保守アクセス', '工具スペース、継手作業性、向きの再現、交換時間、周辺部品の取り外し要否を確認します。'],
            ['インターフェース定義', 'ねじ規格とかかり長さ、またはフランジのインロー、ボルトパターン、締結部品、シール面、公差、固定・回転側を明示します。'],
          ],
        },
        {
          heading: '実用的な取付方式の決定手順',
          ordered: true,
          points: [
            ['両方式を断面図にする', '装置軸、ハウジング、ジョイント、継手、ホース、支持、取り外し方向を描きます。'],
            ['組立公差を確認する', '同心度、振れ、位置決め部、ねじまたはフランジ公差、熱変位を検討します。'],
            ['保守手順を確認する', '作業者が隔離、アクセス、取り外し、再取付、漏れ試験を行う方法を確認します。'],
            ['総合的な統合リスクで選ぶ', '少ない特注部品と明確な保守手順で芯出しと外力を管理できる方式を選びます。'],
          ],
        },
      ],
      inquiryHeading: '装置のねじ取付とフランジ取付を比較する',
      inquiryText: '軸・ハウジング断面図、使用可能スペース、固定側と回転側、回転数、圧力、ポート方向、配管経路、保守アクセス、年間数量をお送りください。',
    },
    'blog-rotary-joint-materials.html': {
      metaDescription: 'ロータリージョイントのアルミ、ステンレス、黄銅を、質量、腐食、流体適合性、強度、加工、ライフサイクルから比較します。',
      heroText: 'ボディ、接液部、シール材質を流体と環境から選びます。すべての用途で最長寿命となる単一の金属はありません。',
      opening: 'ボディ材質はロータリージョイントの耐久性を決める要素の一つです。流体は軸、スリーブ、ポート、締結部品、シールにも接触し、外側は湿気、洗浄薬品、粉じん、塩分にさらされる場合があります。材質選定では、ボディ、接液部品、動的シール面、エラストマを分けて考える必要があります。',
      sections: [
        {
          heading: '代表的なボディ材質の特徴',
          paragraphs: [
            'アルミは軽量で加工しやすく、表面処理と使用環境が腐食・摩耗挙動に影響します。ステンレスは耐食性や厳しい洗浄環境を理由に選ばれることが多い一方、質量、加工費、かじりへの配慮が増えます。黄銅は加工性がよく、多くの空気・水用部品に使われますが、流体化学、温度、接続金属との適合確認が必要です。',
            'この一般説明だけでは適合性を確定できません。材質グレード、熱処理、被膜、表面粗さ、相手材、シール配合、正確な流体条件で結果が変わります。',
          ],
        },
        {
          heading: '材質判断を分けて考える',
          points: [
            ['ボディと取付構造', '質量、剛性、ねじ強度、外部腐食、被膜耐久性、装置への固定方法を確認します。'],
            ['接液部と動的部品', '軸とシール面を含む全接液材質を一覧化し、化学的・電食上の適合性を確認します。'],
            ['シールと運転条件', 'シール材質を流体、圧力、温度、回転数、潤滑、清浄度、停止・回転条件に合わせます。'],
          ],
        },
        {
          heading: '根拠を示せる材質選定の手順',
          ordered: true,
          points: [
            ['流体を定義する', '濃度、添加剤、汚染物、洗浄剤、温度範囲、洗浄後に排出するか充填状態にするかを示します。'],
            ['外部環境を定義する', '湿度、洗浄、塩分、研磨性粉じん、紫外線、周辺装置の薬品との接触を記録します。'],
            ['材料一式を比較する', 'ボディ、軸、ポート、締結部品、被膜、シール、潤滑剤、接続配管を一つのシステムとして確認します。'],
            ['特殊用途を検証する', '未掲載の流体や環境では、量産使用前に材質確認と必要な試験・点検条件を合意します。'],
          ],
        },
      ],
      inquiryHeading: '特定の流体・環境に適した材質を検討する',
      inquiryText: '流体と濃度、添加剤、圧力、温度、回転数、洗浄方法、外部環境、接続材質、必要書類、年間数量をお送りください。',
    },
  },
  ru: {
    'application-packaging-machinery.html': {
      metaDescription: 'Подбор пневматического вращающегося соединения для фасовочных, укупорочных и упаковочных машин с учётом каналов, расхода, скорости, монтажа и мойки.',
      heroText: 'Передавайте сжатый воздух или вакуум на вращающиеся упаковочные станции без перекручивания шлангов и смешивания контуров машины.',
      opening: 'В упаковочных машинах пневмоцилиндры, захваты, вакуумные присоски или сопла обдува часто находятся на вращающейся карусели, а питающий коллектор остаётся неподвижным. Вращающееся соединение передаёт эти среды через подвижный интерфейс. Конфигурацию определяют пневмосхема и механическая компоновка, а не только название упаковочной машины.',
      sections: [
        {
          heading: 'Где устанавливают соединение в упаковочной машине',
          paragraphs: [
            'Типичные узлы — индексные столы, карусели розлива и укупорки, вращающиеся станции запайки, механизмы подачи этикеток и перегрузочные турели. Раздельные каналы могут обслуживать зажим и разжим, вакуум и обдув или несколько независимо управляемых приводов.',
            'Сначала определите функцию на каждой вращающейся станции. Контуру, который должен сохранять давление, переключаться независимо или быть изолированным от вакуума, нужен однозначно назначенный канал. Электрические сигналы, моющая жидкость и другие сервисы могут потребовать отдельного интерфейса или специальной комбинированной конструкции.',
          ],
        },
        {
          heading: 'Три решения, определяющие конфигурацию',
          points: [
            ['Схема контуров', 'Укажите каждую функцию на вращающейся стороне, среду, направление потока и необходимость изоляции от других каналов.'],
            ['Режим работы', 'Сообщите нормальное и максимальное давление, требуемый расход, скорость, частоту пусков и остановов, температуру и условия мойки.'],
            ['Механическая интеграция', 'Проверьте габарит, необходимость сквозного отверстия, неподвижную и вращающуюся стороны, крепление, доступ к портам, опору шлангов и место для обслуживания.'],
          ],
        },
        {
          heading: 'Практическая последовательность проверки',
          ordered: true,
          points: [
            ['Обозначьте вращающиеся контуры', 'Отметьте на пневмосхеме зажим, разжим, вакуум, обдув и остальные функции.'],
            ['Проверьте пиковую потребность', 'Учтите функции, работающие одновременно, и допустимое падение давления на самом удалённом приводе.'],
            ['Сопоставьте механический интерфейс', 'Сверьте порты, крепёж, габарит, центральный проход и прокладку шлангов с компоновкой машины.'],
            ['Вводите каналы в работу по одному', 'Начните с низкого давления и скорости, проверьте функцию и утечку, затем постепенно выйдите на рабочий режим.'],
          ],
        },
      ],
      inquiryHeading: 'Проверить соединение для упаковочной машины',
      inquiryText: 'Пришлите компоновку машины, схему пневматики или вакуума, функции каналов, давление, расход, скорость, монтажный объём, условия мойки и годовое количество. Мы сравним стандартные модели и определим целесообразность специального интерфейса.',
    },
    'application-automation-rotary-tables.html': {
      metaDescription: 'Подбор пневматического вращающегося соединения для автоматических поворотных столов по функциям зажима, каналам, скорости, центральному отверстию и монтажу.',
      heroText: 'Подавайте сжатый воздух через индексные и непрерывно вращающиеся столы автоматизации с чётким разделением функций машины.',
      opening: 'Автоматические поворотные столы могут индексироваться между позициями, останавливаться для сборочной операции или вращаться непрерывно. На подвижной стороне пневматика управляет зажимами, установочными штифтами, выталкивателями, обдувом и разжимом оснастки. Вращающееся соединение должно соответствовать и логике контуров, и механике стола.',
      sections: [
        {
          heading: 'Согласуйте соединение с циклом стола',
          paragraphs: [
            'Индексный стол с остановками и непрерывно вращающийся стол имеют разные режимы движения и нагрузки. Зафиксируйте фактическую скорость при движении, частоту разгонов, время остановки, число циклов за смену и необходимость удержания давления в неподвижном состоянии.',
            'Считайте независимые функции, а не просто шланги. Для зажима и разжима могут требоваться отдельные каналы; несколько одинаковых приспособлений могут использовать общий коллектор только если это допускает схема машины. Центральный проход для кабелей, вала или инструмента может быть не менее важен, чем число каналов.',
          ],
        },
        {
          heading: 'Проверка интерфейса поворотного стола',
          points: [
            ['Пневмосхема', 'Определите функцию каждого канала, направление потока, давление, расход и допустимый риск сообщения между каналами.'],
            ['Геометрия стола', 'Проверьте центральное отверстие, посадочный диаметр, крепёжный рисунок, осевую длину, направление портов и доступ к фитингам.'],
            ['Нагрузки и соосность', 'Поддерживайте шланги и коллекторы отдельно, чтобы биение стола, изгиб или стопор не нагружали вращающееся соединение.'],
          ],
        },
        {
          heading: 'От чертежа стола к выбору модели',
          ordered: true,
          points: [
            ['Предоставьте разрез', 'Покажите ось стола, неподвижные и вращающиеся детали, доступный объём и соседние кабели или валы.'],
            ['Приложите схему контуров', 'Обозначьте одновременно работающие функции и функции, которые должны оставаться изолированными.'],
            ['Укажите реальный цикл', 'Приведите нормальное и максимальное давление, скорость, температуру, пуски в час и часы работы в сутки.'],
            ['Проверьте собранный стол', 'После центровки испытайте каждый канал в покое и при контролируемом вращении до запуска производства.'],
          ],
        },
      ],
      inquiryHeading: 'Подобрать соединение к автоматическому поворотному столу',
      inquiryText: 'Пришлите разрез стола, пневмосхему, требуемое центральное отверстие, функции каналов, давление, расход, индексный цикл или скорость, монтажный объём и количество.',
    },
    'application-pneumatic-tools-hose-anti-twist.html': {
      metaDescription: 'Выбор пневматического шарнира для инструмента и защиты шланга от скручивания по расходу, падению давления, движению, резьбе, нагрузке и безопасности.',
      heroText: 'Уменьшите скручивание шланга у пневмоинструмента и подвесных рабочих мест, сохранив расход воздуха и безопасное управление.',
      opening: 'Пневматический поворотный шарнир допускает относительное движение между шлангом сжатого воздуха и инструментом. Он улучшает управление и уменьшает повторное скручивание шланга, но не становится автоматически быстроходным вращающимся соединением, опорой реактивного момента, несущим шарниром или точкой подвеса.',
      sections: [
        {
          heading: 'Определите движение до выбора шарнира',
          paragraphs: [
            'Ручному инструменту обычно требуется периодическое угловое движение при смене положения оператором. Балансиры, гайковёрты, катушки и шарнирные приспособления могут создавать больший угол и более частые повороты. Укажите, качается ли соединение, поворачивается иногда или вращается непрерывно, а также наличие бокового натяжения шланга.',
            'Расход не менее важен, чем размер резьбы. Компактный шарнир с узким внутренним проходом может вызвать падение давления, замедлить инструмент или изменить момент затяжки. При оценке проходного сечения используйте расход воздуха и минимальное входное давление, указанные изготовителем инструмента.',
          ],
        },
        {
          heading: 'Проверки для инструмента и шланга',
          points: [
            ['Параметры воздуха', 'Укажите давление питания, пиковый расход, рабочий цикл, качество воздуха, смазку и минимальное давление на входе инструмента.'],
            ['Соединение и движение', 'Согласуйте обе резьбы, размер шланга, диапазон поворота, радиус изгиба и пространство возле рукоятки.'],
            ['Механическая безопасность', 'Используйте разгрузку натяжения и опору шланга; не передавайте через шарнир вес инструмента, момент затяжки и усилие от хлещущего шланга.'],
          ],
        },
        {
          heading: 'Оценка установки против скручивания',
          ordered: true,
          points: [
            ['Осмотрите существующий шланг', 'Замените повреждённый шланг или фитинги до того, как считать утечку или тугое движение неисправностью шарнира.'],
            ['Измерьте требуемое движение', 'Наблюдайте реальную работу инструмента и запишите угол, частоту, натяжение шланга и места помех.'],
            ['Проверьте расход и интерфейсы', 'Сопоставьте давление, расход, резьбы портов, способ уплотнения и диаметр шланга с выбранным шарниром.'],
            ['Испытайте при обычной работе', 'Сначала проверьте герметичность, затем свободу движения, давление у инструмента и поведение шланга во всём цикле.'],
          ],
        },
      ],
      inquiryHeading: 'Проверить применение пневматического шарнира',
      inquiryText: 'Пришлите модель инструмента, расход воздуха, давление питания, размеры резьб и шланга, характер движения, фотографии соединения и годовое количество. Мы рассмотрим стандартный шарнир или компактный специальный интерфейс.',
    },
    'application-robot-end-of-arm-tooling.html': {
      metaDescription: 'Подбор пневматического вращающегося соединения для оснастки робота по захватам, вакууму, обдуву, движению кисти, нагрузке, шлангам и интерфейсу.',
      heroText: 'Подавайте воздух к захватам, присоскам, обдуву и другим функциям через вращающуюся кисть робота без неконтролируемого наматывания шлангов.',
      opening: 'Концевая оснастка робота может объединять захваты, вакуумные контуры, обдув, сменщик инструмента и датчики в небольшом подвижном объёме. Вращающееся соединение передаёт пневматические среды через ось, но распределение каналов, движение кисти, полезную нагрузку и интерфейс инструмента необходимо рассматривать совместно.',
      sections: [
        {
          heading: 'Составьте карту сервисов на кисти робота',
          paragraphs: [
            'Перечислите каждый захват, вакуумную зону, линию отпускания, продувки и обдува. Отметьте функции, работающие одновременно, и контуры, которые должны оставаться изолированными. Не объединяйте контуры только потому, что они используют одинаковое давление питания.',
            'Электропитание, сигналы датчиков, данные, охлаждающая жидкость или гидравлика требуют собственных совместимых интерфейсов. Пневматическое вращающееся соединение может входить в комбинированный узел, но требования к электрическим и жидкостным каналам задают отдельно, а не выводят из числа воздушных каналов.',
          ],
        },
        {
          heading: 'Факторы интеграции с роботом',
          points: [
            ['Движение и режим', 'Укажите диапазон оси, максимальную скорость, ускорение, реверсы, циклы в час и необходимость неограниченного вращения.'],
            ['Нагрузка и габарит', 'Учтите массу соединения, центр тяжести инструмента, ограничения инерции, центральный проход, крепёж кисти и зазоры от столкновений.'],
            ['Шланги и обслуживание', 'Поддерживайте шланги, соблюдайте радиус изгиба, исключите защемление и оставьте доступ к фитингам и замене.'],
          ],
        },
        {
          heading: 'Комплект данных для выбора EOAT',
          ordered: true,
          points: [
            ['Предоставьте чертежи кисти и инструмента', 'Покажите фланец робота, инструментальную плиту, ось, монтажный пакет и доступное пространство.'],
            ['Предоставьте карту сервисов', 'Укажите среду, давление, расход, функцию канала, положение клапана и одновременную потребность.'],
            ['Предоставьте профиль движения', 'Укажите диапазон оси, скорость, ускорение, реверсы, время цикла и ожидаемые часы работы.'],
            ['Проверьте на роботе', 'На сниженной скорости проверьте утечку, поведение шлангов, зазоры, данные нагрузки и каждую функцию инструмента.'],
          ],
        },
      ],
      inquiryHeading: 'Проверить интерфейс кисти робота или EOAT',
      inquiryText: 'Пришлите модель робота, чертежи кисти и инструмента, пневмосхему, функции каналов, давление, расход, профиль движения, ограничения нагрузки, другие сервисы и годовое количество.',
    },
    'blog-rotary-joint-leaking.html': {
      metaDescription: 'Диагностика утечки вращающегося соединения: поиск места, разделение дефектов фитинга и уплотнения, проверка центровки, режима и каждого канала.',
      heroText: 'До замены деталей последовательно отделите неисправности шланга, фитинга, статического и вращающегося уплотнения, а также межканальную утечку.',
      opening: 'Видимая утечка воздуха или жидкости не всегда означает отказ внутреннего вращающегося уплотнения. Похожие признаки дают ослабленный фитинг, повреждённая трубка, загрязнённая поверхность, боковая нагрузка, несоосность, превышение режима или сообщение каналов. До разборки обезопасьте машину и определите точное место утечки.',
      sections: [
        {
          heading: 'Начните с места и момента появления утечки',
          paragraphs: [
            'Определите, выходит ли среда из соединения шланга, неподвижного стыка корпуса, вращающегося интерфейса, дренажа или другого канала. Запишите, возникает ли утечка в покое, только при вращении, после прогрева или при подаче давления в конкретный контур.',
            'Эти наблюдения сужают поиск. Утечку фитинга часто устраняют без вскрытия соединения. Если величина меняется со скоростью, положением вала, температурой или движением шланга, проверяйте центровку, внешнюю нагрузку, состояние поверхности и динамическое уплотнение.',
          ],
        },
        {
          heading: 'Распространённые причины',
          points: [
            ['Внешние соединения', 'Проверьте срез трубки, обжимные кольца, резьбу, способ герметизации, переходники и затяжку в пределах требований фитинга.'],
            ['Монтаж', 'Проверьте соосность, биение, жёсткие трубы, натяжение шланга, изгиб, стопор и загрязнение у вращающегося интерфейса.'],
            ['Эксплуатация', 'Сопоставьте фактическую среду, давление, скорость, температуру, рабочий цикл, фильтрацию и смазку с выбранной конфигурацией.'],
          ],
        },
        {
          heading: 'Последовательность диагностики утечки',
          ordered: true,
          points: [
            ['Обезопасьте машину', 'Остановите вращение, изолируйте все источники энергии, сбросьте давление во всех каналах и очистите участок.'],
            ['Проверьте внешние стыки', 'Контролируемо подавайте давление по одному каналу и применяйте подходящий метод поиска утечки на шлангах и фитингах.'],
            ['Разделите покой и вращение', 'Запишите утечку в покое и при медленном вращении, не превышая опубликованные пределы.'],
            ['Осмотрите до замены уплотнений', 'При внутренней утечке проверьте вал, уплотняющие поверхности, подшипники, загрязнение и центровку; новое уплотнение не исправит повреждённые детали.'],
            ['Повторно проверьте все каналы', 'После ремонта проверьте разделение каналов и герметичность при низком давлении и скорости до возврата к нормальной работе.'],
          ],
        },
      ],
      inquiryHeading: 'Запросить помощь в диагностике утечки',
      inquiryText: 'Пришлите модель, место утечки, фото или видео, среду, давление, скорость, температуру, рабочий цикл, монтажный чертёж, наработку и сведения об изменениях перед появлением утечки.',
    },
    'blog-seal-replacement.html': {
      metaDescription: 'Безопасная замена уплотнений вращающегося соединения: подтверждение дефекта, правильный комплект, осмотр деталей, чистая сборка и испытание каналов.',
      heroText: 'Убедитесь, что причина в уплотнении, защитите рабочие поверхности и проверьте отремонтированное соединение до возврата в эксплуатацию.',
      opening: 'Замена уплотнений может восстановить ремонтопригодное вращающееся соединение, но не устраняет любую утечку. Поцарапанный вал, изношенный подшипник, коррозия поверхности, неподходящая среда, боковая нагрузка или повреждённый фитинг приведут к повторной утечке даже с новым уплотнением. До вскрытия диагностируйте узел и получите комплект для точной модели.',
      sections: [
        {
          heading: 'Определите целесообразность замены уплотнений',
          paragraphs: [
            'Подтвердите точную модель и ревизию, найдите место утечки и сопоставьте режим с выбранной конфигурацией. Сначала проверьте внешние фитинги и центровку. При повреждении корпуса, вала, подшипника или дорожки уплотнения ремонт либо замена всего узла может быть надёжнее одной замены уплотнений.',
            'Материал и геометрия уплотнения должны соответствовать среде, давлению, температуре, скорости и сопряжённой поверхности. Не устанавливайте визуально похожее кольцо или динамическое уплотнение без проверки размеров и совместимости материала.',
          ],
        },
        {
          heading: 'Подготовка против повторной утечки',
          points: [
            ['Правильные детали', 'Используйте комплект уплотнений, сборочный чертёж, инструмент, смазку и данные затяжки для точной конфигурации.'],
            ['Чистое рабочее место', 'Не допускайте ворс, стружку, абразивную пыль, повреждённые крючки и неразрешённые очистители к уплотнениям и рабочим поверхностям.'],
            ['Критерии осмотра', 'Проверьте валы, канавки, дорожки, подшипники, резьбы и порты на износ, коррозию, заусенцы, риски и внедрённые частицы.'],
          ],
        },
        {
          heading: 'Замена и повторный ввод в работу',
          ordered: true,
          points: [
            ['Изолируйте и зафиксируйте', 'Заблокируйте машину, сбросьте давление во всех каналах, отметьте ориентацию и сфотографируйте трубопроводы и порядок деталей.'],
            ['Разбирайте без царапин', 'Используйте предусмотренный инструмент, защищайте точные поверхности и не опирайте рычаг на дорожку уплотнения.'],
            ['Очистите и осмотрите', 'Удалите остатки без изменения размеров и решите, пригодны ли детали для повторного использования.'],
            ['Установите без перекручивания', 'Смазывайте только по инструкции, защищайте кромки уплотнения от резьб и острых граней и проверяйте посадку.'],
            ['Соберите по правильным данным', 'Восстановите ориентацию, крепёж, фитинги и стопор согласно требованиям модели и соединений.'],
            ['Испытывайте постепенно', 'Проверьте разделение и утечку каждого канала при низком давлении, затем медленно вращайте и повышайте нагрузку, контролируя температуру и трение.'],
          ],
        },
      ],
      inquiryHeading: 'Определить правильный способ ремонта уплотнений',
      inquiryText: 'Пришлите модель соединения, серийные данные или ревизию при наличии, среду, давление, скорость, место утечки, фотографии снятых деталей и состояние вала или уплотняющей поверхности.',
    },
    'blog-threaded-vs-flange.html': {
      metaDescription: 'Сравнение резьбового и фланцевого монтажа вращающегося соединения по габариту, центровке, стопору, нагрузке труб, доступу и обслуживанию.',
      heroText: 'Выбирайте монтажный интерфейс по конструкции машины и плану обслуживания, а не только по внешнему виду вращающегося соединения.',
      opening: 'Резьбовые и фланцевые вращающиеся соединения могут работать надёжно при правильно спроектированном интерфейсе. Выбор зависит от доступного места, способа центровки, пути нагрузки, доступа к подключениям, процедуры снятия и поддержки неподвижной и вращающейся сторон.',
      sections: [
        {
          heading: 'Чем отличаются два способа монтажа',
          paragraphs: [
            'Резьбовое соединение может быть компактным и прямым, но важны длина зацепления, способ герметизации, монтажный момент, ориентация и доступ для снятия. Конструкция машины должна исключать передачу изгиба и кручения от шлангов и фитингов на соединение.',
            'Фланец задаёт крепёжный рисунок и посадочную поверхность, что может упростить ориентацию и повторный монтаж. Обычно ему требуется больше радиального места и подходящая ответная плоскость. Фланец не исправляет несоосность и не отменяет опору шлангов и контроль от проворачивания.',
          ],
        },
        {
          heading: 'Факторы на уровне машины',
          points: [
            ['Центровка и путь нагрузки', 'Определите базирование оси и способ исключения осевых, радиальных, изгибающих и крутящих нагрузок на соединение.'],
            ['Доступ при сборке и обслуживании', 'Проверьте место для инструмента, доступ к фитингам, фиксацию ориентации, время замены и необходимость снятия соседних деталей.'],
            ['Определение интерфейса', 'Задайте стандарт и длину резьбы либо фланцевую посадку, болтовой рисунок, крепёж, уплотняющую поверхность, допуски и стороны узла.'],
          ],
        },
        {
          heading: 'Практический процесс выбора монтажа',
          ordered: true,
          points: [
            ['Начертите оба варианта в разрезе', 'Покажите вал, корпус машины, соединение, фитинги, шланги, опоры и направление снятия.'],
            ['Проверьте сборочные допуски', 'Рассмотрите соосность, биение, базирующие элементы, допуски резьбы или фланца и температурные перемещения.'],
            ['Проверьте обслуживание', 'Уточните, как персонал изолирует, получает доступ, снимает, устанавливает и испытывает соединение.'],
            ['Выберите по общему риску интеграции', 'Предпочтите интерфейс, который контролирует центровку и внешние нагрузки с минимумом специальных деталей и понятным обслуживанием.'],
          ],
        },
      ],
      inquiryHeading: 'Сравнить резьбовой и фланцевый интерфейс машины',
      inquiryText: 'Пришлите разрез вала и корпуса, доступный объём, неподвижную и вращающуюся стороны, скорость, давление, направление портов, прокладку шлангов, доступ для обслуживания и годовое количество.',
    },
    'blog-rotary-joint-materials.html': {
      metaDescription: 'Сравнение алюминия, нержавеющей стали и латуни для вращающихся соединений по массе, коррозии, среде, прочности, изготовлению и ресурсу.',
      heroText: 'Выбирайте материалы корпуса, смоченных деталей и уплотнений по среде и условиям; универсального металла с максимальным ресурсом не существует.',
      opening: 'Материал корпуса — только один из факторов долговечности вращающегося соединения. Среда может контактировать с валами, втулками, портами, крепежом и уплотнениями, а наружные поверхности подвергаются влажности, моющим химикатам, пыли или соли. Правильный выбор отдельно рассматривает корпус, смоченные детали, динамические поверхности и эластомеры.',
      sections: [
        {
          heading: 'Свойства распространённых материалов корпуса',
          paragraphs: [
            'Алюминий уменьшает массу и хорошо обрабатывается; покрытие и внешняя среда влияют на коррозию и износ. Нержавеющую сталь часто выбирают для более высокой коррозионной стойкости или интенсивной мойки, учитывая большую массу, стоимость обработки и риск заедания. Латунь хорошо обрабатывается и применяется во многих воздушных и водяных компонентах, однако совместимость зависит от химии среды, температуры и соединённых металлов.',
            'Эти общие свойства сами по себе не подтверждают совместимость. Марка, термообработка, покрытие, шероховатость, сопряжённые материалы, состав уплотнения и точная рабочая среда могут изменить результат.',
          ],
        },
        {
          heading: 'Разделяйте решения по материалам',
          points: [
            ['Корпус и монтажная структура', 'Оцените массу, жёсткость, прочность резьбы, внешнюю коррозию, стойкость покрытия и крепление к машине.'],
            ['Смоченные и динамические детали', 'Перечислите все контактирующие со средой материалы, включая вал и уплотняющие поверхности, и проверьте химическую и гальваническую совместимость.'],
            ['Уплотнения и режим', 'Согласуйте материал уплотнения со средой, давлением, температурой, скоростью, смазкой, чистотой и периодами покоя или вращения.'],
          ],
        },
        {
          heading: 'Обоснованная последовательность выбора материала',
          ordered: true,
          points: [
            ['Определите жидкости', 'Укажите концентрацию, добавки, загрязнения, моющие средства, диапазон температур и остаётся ли система заполненной после промывки.'],
            ['Определите внешнюю среду', 'Зафиксируйте влажность, мойку, соль, абразивную пыль, ультрафиолет и контакт с химикатами машины.'],
            ['Сравните полный набор материалов', 'Рассмотрите корпус, вал, порты, крепёж, покрытия, уплотнения, смазки и присоединённые трубы как единую систему.'],
            ['Подтвердите специальные условия', 'Для неуказанной среды или окружения до серийной эксплуатации запросите проверку материалов и согласуйте испытания или контроль.'],
          ],
        },
      ],
      inquiryHeading: 'Проверить материалы для конкретной среды или окружения',
      inquiryText: 'Пришлите среду и концентрацию, добавки, давление, температуру, скорость, способ мойки, внешние условия, присоединённые материалы, требуемые документы и годовое количество.',
    },
  },
};
