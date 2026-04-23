/* eslint-disable react/prop-types */
import React, { useState, useCallback, useEffect } from 'react';
import {ReactFlow, Controls, Background, Panel, useNodesState, useEdgesState, addEdge, getIncomers, getOutgoers, getConnectedEdges, useReactFlow} from '@xyflow/react';
import { Eraser } from './C_Components/EraserTool/Eraser';
import '@xyflow/react/dist/style.css';
import DropdownMenu from './C_Components/MenuDeroulant';
import { takeScreenshot } from './H_SaveAndLoad/screenshotUtils';
import Toggle10choice from './F_Gestion_Langues/togglechoice';

import {
  STACK_Parameter_Tab, IDFAN_Parameter_Tab, QUENCH_Parameter_Tab, WHB_Parameter_Tab, 
  DENOX_Parameter_Tab, BHF_Parameter_Tab, COOLINGTOWER_Parameter_Tab, ELECTROFILTER_Parameter_Tab,
  CYCLONE_Parameter_Tab, REACTOR_Parameter_Tab, RK_Parameter_Tab, SCRUBBER_Parameter_Tab,
  CO2_Parameter_Tab, GF_Parameter_Tab, FB_Parameter_Tab,RKMainPage, FBMainPage, WHBMainPage,
  CO2MainPage, QUENCHMainPage, CYCLONEMainPage, BHFMainPage, ELECTROFILTERMainPage,
  REACTORMainPage, DENOXMainPage, STACKMainPage, SCRUBBERMainPage, IDFANMainPage, COOLINGTOWERMainPage,

  AIRCOOLERMainPage ,
  WATERCOOLERMainPage,
 TUBEANDSHELLMainPage ,
 
 
 SEP12MainPage,
 SEP21MainPage,

} from './C_Components/RetroAndBilanComponents';

import Sidebar from './C_Components/SidebarV1';
import OPEX_form from './OPEX';
import LinearGraph from './G_Graphiques/Combustion_diagramme/LinearGraph';
import DataFlowDisplay from './C_Components/DataFlowDisplay';
import DashboardWindow from './G_Graphiques/Dashboard/Dashboard';
import GlobalReport from './D_BILAN_Rapports/GlobalReport';
import GlobalRetroReport from './D_BILAN_Rapports/GlobalRetroReport';

const initialNodes = [];
const initialEdges = [];

function FitViewButton() {
  const { fitView } = useReactFlow();
  return (
    <button
      className="fit-btn"
      onClick={() => fitView({ padding: 0.2, duration: 300 })}
      title="Fit canvas to window"
    >
      ⤢ Fit
    </button>
  );
}

function LockScrollButton() {
  const { fitView } = useReactFlow();
  const [locked, setLocked] = React.useState(false);

  const toggle = () => {
    const next = !locked;
    document.documentElement.style.overflow = next ? 'hidden' : '';
    document.body.style.overflow = next ? 'hidden' : '';
    if (next) fitView({ padding: 0.2, duration: 300 });
    setLocked(next);
  };

  return (
    <button
      className={`lock-btn${locked ? ' active' : ''}`}
      onClick={toggle}
      title={locked ? 'Restore scrollbars' : 'Hide scrollbars & fit view'}
    >
      {locked ? '⊠ Locked' : '⊡ Lock'}
    </button>
  );
}

function Flow({
  currentUser,
  adminEmail,
  onShowEmailManagement,
  onLogout
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [headNode, setHeadNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [mode, setMode] = useState(() => localStorage.getItem('mode') || 'Bilan');
  const [showDataFlowDisplay, setShowDataFlowDisplay] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const [showOPEX, setShowOPEX] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [isEraserActive, setIsEraserActive] = useState(false);

  // Language management state
  const [currentLanguage, setCurrentLanguage] = useState(() => 
    localStorage.getItem('selectedLanguage') || 'fr'
  );
  
  // Fonction pour mettre à jour la langue
  const handleLanguageChange = useCallback((newLanguage) => {
    setCurrentLanguage(newLanguage);
    localStorage.setItem('selectedLanguage', newLanguage);
  }, []);

  const toggleOPEX = useCallback(() => {
    setShowOPEX(prevShowOPEX => !prevShowOPEX);
  }, []);

  // Save mode to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('mode', mode);
  }, [mode]);

  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
  }, []);

  const toggleMode = useCallback(() => {
    setMode((prevMode) => (prevMode === 'Retro bilan' ? 'Bilan' : 'Retro bilan'));
  }, []);

  const onConnect = useCallback((params) => setEdges((els) => addEdge(params, els)), []);

  const onNodesDelete = useCallback(
    (deleted) => {
      setEdges((currentEdges) =>
        deleted.reduce((acc, node) => {
          const incomers = getIncomers(node, nodes, currentEdges);
          const outgoers = getOutgoers(node, nodes, currentEdges);
          const connectedEdges = getConnectedEdges([node], currentEdges);

          const remainingEdges = acc.filter((edge) => !connectedEdges.includes(edge));
          const createdEdges = incomers.flatMap(({ id: source }) =>
            outgoers.map(({ id: target }) => ({
              id: `${source}->${target}`,
              source,
              target,
            }))
          );

          return [...remainingEdges, ...createdEdges];
        }, currentEdges)
      );
    },
    [nodes]
  );

  const onAddNode = useCallback(
    (label) => {
      const newNode = {
        id: `${nodes.length + 1}`,
        data: { label },
        position: { x: headNode ? headNode.position.x + 200 : 0, y: 100 },
        sourcePosition: 'right',
        targetPosition: 'left',
        type: label === 'STACK' ? 'output' : ['RK', 'GF', 'FB'].includes(label) ? 'input' : undefined,
      };
      setNodes((prevNodes) => [...prevNodes, newNode]);

      if (headNode) {
        setEdges((prevEdges) => [
          ...prevEdges,
          {
            id: `${headNode.id}-${newNode.id}`,
            source: headNode.id,
            target: newNode.id,
            label: (prevEdges.length + 1).toString(),
            type: 'step',
          },
        ]);
      }

      setHeadNode(newNode);
    },
    [nodes, headNode, setNodes, setEdges]
  );

  const onSendData = useCallback(
    (data) => {
      if (selectedNode) {
        const targetNode = nodes.find((node) =>
          mode === 'Bilan'
            ? edges.some((edge) => edge.source === selectedNode.id && edge.target === node.id)
            : edges.some((edge) => edge.target === selectedNode.id && edge.source === node.id)
        );
  
        // Mise à jour du nœud cible avec les résultats
        if (targetNode) {
          setNodes((prevNodes) =>
            prevNodes.map((node) =>
              node.id === targetNode.id
                ? { ...node, data: { ...node.data, result: data.result } }
                : node
            )
          );
        }
  
        // Mise à jour du nœud sélectionné avec result + consommationElec
        const elecValue = data.result?.activeNodes_Elec?.[0]?.data?.consommationElec;
        const eauValue = data.result?.activeNodes_Eau?.[0]?.data?.consommationEau;
        const reactifsValue = data.result?.activeNodes_Reactifs?.[0]?.data?.consommationReactifs;
        const energieValue = data.result?.activeNodes_Energie?.[0]?.data?.consommationEnergie;
        const CO2Value = data.result?.activeNodes_CO2?.[0]?.data?.emissionsCO2;
        const coutValue = data.result?.activeNodes_cout?.[0]?.data?.cout;

        setNodes((prevNodes) =>
          prevNodes.map((node) =>
            node.id === selectedNode.id
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    result: data.result,
                    ...(data.inputData !== undefined && { inputData: data.inputData }),
                    ...(elecValue !== undefined && { consommationElec: elecValue }),
                    ...(eauValue !== undefined && { consommationEau: eauValue }),
                    ...(reactifsValue !== undefined && { consommationReactifs: reactifsValue }),
                    ...(energieValue !== undefined && { consommationEnergie: energieValue }),
                    ...(CO2Value !== undefined && { emissionsCO2: CO2Value }),
                    ...(coutValue !== undefined && { cout: coutValue }),
                    isActive: true,
                  },
                }
              : node
          )
        );
      }
    },
    [selectedNode, nodes, edges, mode, setNodes]
  );

  const renderParameterTab = () => {
    if (!selectedNode) return null;

    const componentMap = {
      ...(mode === 'Bilan' ? { RK: RKMainPage } : { RK: RK_Parameter_Tab }),
      ...(mode === 'Bilan' ? { FB: FBMainPage } : { FB: FB_Parameter_Tab }),
      ...(mode === 'Bilan' ? { GF: GF_Parameter_Tab} : { GF: GF_Parameter_Tab }),
      ...(mode === 'Bilan' ? { WHB: WHBMainPage } : { WHB: WHB_Parameter_Tab }),
      ...(mode === 'Bilan' ? { CO2: CO2MainPage } : { CO2: CO2_Parameter_Tab }),
      ...(mode === 'Bilan' ? { QUENCH: QUENCHMainPage } : { QUENCH: QUENCH_Parameter_Tab }),
      ...(mode === 'Bilan' ? { CYCLONE: CYCLONEMainPage } : { CYCLONE: CYCLONE_Parameter_Tab }),
      ...(mode === 'Bilan' ? { SCRUBBER: SCRUBBERMainPage } : { SCRUBBER: SCRUBBER_Parameter_Tab }),
      ...(mode === 'Bilan' ? { BHF: BHFMainPage } : { BHF: BHF_Parameter_Tab }),
      ...(mode === 'Bilan' ? { ELECTROFILTER: ELECTROFILTERMainPage } : { ELECTROFILTER: ELECTROFILTER_Parameter_Tab }),
      ...(mode === 'Bilan' ? { DENOX: DENOXMainPage } : { DENOX: DENOX_Parameter_Tab }),
      ...(mode === 'Bilan' ? { REACTOR: REACTORMainPage } : { REACTOR: REACTOR_Parameter_Tab }),
      ...(mode === 'Bilan' ? { STACK: STACKMainPage } : { STACK: STACK_Parameter_Tab }),
      ...(mode === 'Bilan' ? { IDFAN: IDFANMainPage } : { IDFAN: IDFAN_Parameter_Tab }),
      ...(mode === 'Bilan' ? { COOLINGTOWER: COOLINGTOWERMainPage } : { COOLINGTOWER: COOLINGTOWER_Parameter_Tab }),

      /*
      ...(mode === 'Bilan' ? { Cooling_HX_air: AIRCOOLERMainPage } : { Cooling_HX_air: AIRCOOLER_Parameter_Tab }),
      ...(mode === 'Bilan' ? { Cooling_HX_eau: WATERCOOLERMainPage } : { Cooling_HX_eau: WATERCOOLER_Parameter_Tab }),
      ...(mode === 'Bilan' ? { HX_TubeAndShell: TUBEANDSHELLMainPage } : { HX_TubeAndShell: TUBEANDSHELL_Parameter_Tab }),
      
      ...(mode === 'Bilan' ? { '2to1': SEP21MainPage } : { '2to1': SEP21_Parameter_Tab }),
      ...(mode === 'Bilan' ? { '1to2': SEP12MainPage } : { '1to2': SEP12_Parameter_Tab }),
*/


      ...(mode === 'Bilan' ? { Cooling_HX_air: AIRCOOLERMainPage } : {}),
      ...(mode === 'Bilan' ? { Cooling_HX_eau: WATERCOOLERMainPage } : {}),
      ...(mode === 'Bilan' ? { HX_TubeAndShell: TUBEANDSHELLMainPage } : {}),
      
      ...(mode === 'Bilan' ? { '2to1': SEP21MainPage } : {}),
      ...(mode === 'Bilan' ? { '1to2': SEP12MainPage } : {}),








    };

    const Component = componentMap[selectedNode.data.label];
    if (!Component) return null;

    return (
      <Component
        title={selectedNode.data.label}
        nodeData={selectedNode.data}
        onSendData={onSendData}
        onGoBack={() => setSelectedNode(null)}
        onClose={() => setSelectedNode(null)}
        currentLanguage={currentLanguage}
      />
    );
  };

  // Function to save the project
  const handleSaveProject = () => {
    const projectData = {
      nodes,
      edges,
      selectedNode,
      mode,
      currentLanguage
    };

    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
   
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'project-config.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Function to load the project
  const handleLoadProject = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
   
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const projectData = JSON.parse(event.target.result);
            setNodes(projectData.nodes || []);
            setEdges(projectData.edges || []);
            setSelectedNode(projectData.selectedNode);
            setMode(projectData.mode || 'Bilan');
            
            // Load language from project if available
            if (projectData.currentLanguage) {
              setCurrentLanguage(projectData.currentLanguage);
              localStorage.setItem('selectedLanguage', projectData.currentLanguage);
            }
          } catch (error) {
            console.error('Error loading project:', error);
            alert('Error loading project file. Please ensure it is a valid project configuration.');
          }
        };
        reader.readAsText(file);
      }
    };
   
    input.click();
  };

  const handleScreenshot = useCallback(async () => {
    try {
      await takeScreenshot();
    } catch (error) {
      console.error('Screenshot failed:', error);
    }
  }, []);

  const [showRapportEditor, setShowRapportEditor] = useState(false);
  const [showRetroRapportEditor, setShowRetroRapportEditor] = useState(false);
  const handleEditRapport = useCallback(() => {
    if (mode === 'Bilan') {
      setShowRapportEditor(prev => !prev);
    } else {
      setShowRetroRapportEditor(prev => !prev);
    }
  }, [mode]);

  return (
    <div className="Zone-fond-blanc">
      <Sidebar onAddNode={onAddNode} currentLanguage={currentLanguage} />
      
      <DropdownMenu 
        currentUser={currentUser}
        adminEmail={adminEmail}
        mode={mode}
        showDataFlowDisplay={showDataFlowDisplay}
        showGraph={showGraph}
        showOPEX={showOPEX}
        onToggleMode={toggleMode}
        onToggleDataFlow={() => setShowDataFlowDisplay(!showDataFlowDisplay)}
        onToggleGraph={() => setShowGraph(!showGraph)}
        onShowDashboard={() => setShowDashboard(true)}
        onShowEmailManagement={onShowEmailManagement}
        onToggleOPEX={toggleOPEX}
        onSaveProject={handleSaveProject}
        onLoadProject={handleLoadProject}
        onLogout={onLogout}
        onScreenshot={handleScreenshot}
        onEditRapport={handleEditRapport}
        currentLanguage={currentLanguage}
        onLanguageChange={handleLanguageChange}
      />

      <div className="relative-flex-container">
        <div className="btn-position">
          <Toggle10choice 
            currentLanguage={currentLanguage}
            onLanguageChange={handleLanguageChange}
          />
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodeClick={isEraserActive ? undefined : onNodeClick}
          onNodesChange={onNodesChange}
          onNodesDelete={onNodesDelete}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          attributionPosition="top-right"
          style={{ backgroundColor: '#F7F9FB' }}
        >
          <Background />
          <Controls />
          <Panel position="top-left">
            <button
              className={`eraser-btn${isEraserActive ? ' active' : ''}`}
              onClick={() => setIsEraserActive((v) => !v)}
            >
              🧹 Erase
            </button>
            <FitViewButton />
            <LockScrollButton />
          </Panel>
          {isEraserActive && <Eraser />}
        </ReactFlow>
      </div>

      {showDataFlowDisplay && (
        <DataFlowDisplay 
          nodes={nodes} 
          currentLanguage={currentLanguage} 
        />
      )}
      
      {showGraph && (
        <LinearGraph 
          currentLanguage={currentLanguage} 
        />
      )}
      
      {renderParameterTab()}
      
      {showDashboard && (
        <DashboardWindow 
          onClose={() => setShowDashboard(false)}
          nodes={nodes}
          currentLanguage={currentLanguage}
        />
      )}   

      {showOPEX && (
        <OPEX_form
          onClose={() => setShowOPEX(false)}
          currentLanguage={currentLanguage}
        />
      )}

      {showRapportEditor && (
        <GlobalReport
          nodes={nodes}
          onClose={() => setShowRapportEditor(false)}
        />
      )}

      {showRetroRapportEditor && (
        <GlobalRetroReport
          nodes={nodes}
          onClose={() => setShowRetroRapportEditor(false)}
        />
      )}
    </div>
  );
}

export default Flow;


