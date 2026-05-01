"use client";

import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { usePipelineStore } from "@/stores";
import { PIPELINE_STAGES } from "@/lib/utils";
import { motion } from "framer-motion";
import { Calendar, MoreHorizontal, User, Brain } from "lucide-react";

export default function PipelineBoard({ initialCandidates, vacancies }: { initialCandidates: Record<string, any[]>, vacancies: any[] }) {
  const { candidates, setCandidates, moveCandidate } = usePipelineStore();
  const [selectedVacancy, setSelectedVacancy] = useState("all");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Only render dnd on client side to avoid hydration mismatch
    setIsMounted(true);
    // Initialize with DB data
    setCandidates(initialCandidates);
  }, [setCandidates, initialCandidates]);

  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;

    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    // Call API to update the stage in DB here if this was a full production system backend
    // fetch(`/api/applications/${draggableId}`, { method: 'PATCH', body: JSON.stringify({ currentStage: destination.droppableId.toUpperCase() }) });

    moveCandidate(draggableId, source.droppableId, destination.droppableId, destination.index);
  };

  if (!isMounted) return null;

  // Filter candidates by selected vacancy
  const filteredCandidates = Object.keys(candidates).reduce((acc, stageId) => {
    acc[stageId] = candidates[stageId]?.filter(c => selectedVacancy === "all" || c.vacancyId === selectedVacancy) || [];
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-nuanu-navy">Hiring Pipeline</h1>
          <p className="text-sm text-nuanu-gray-500 mt-1">Manage candidates through the recruitment process</p>
        </div>
        
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-nuanu-gray-600">Vacancy:</label>
          <select 
            value={selectedVacancy}
            onChange={(e) => setSelectedVacancy(e.target.value)}
            className="input-field py-2 bg-white"
          >
            <option value="all">All Vacancies</option>
            {vacancies.map(v => (
              <option key={v.id} value={v.id}>{v.title}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto pb-4">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex h-full items-start gap-4 px-1 min-w-max">
            {PIPELINE_STAGES.map((stage) => {
              const columnCandidates = filteredCandidates[stage.id] || [];
              
              return (
                <div key={stage.id} className="w-80 flex flex-col h-full bg-nuanu-gray-100 rounded-xl overflow-hidden border border-nuanu-gray-200">
                  {/* Column Header */}
                  <div className="p-3 border-b border-nuanu-gray-200 bg-white flex justify-between items-center shadow-sm z-10">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
                      <h3 className="font-semibold text-nuanu-navy text-sm">{stage.label}</h3>
                    </div>
                    <span className="bg-nuanu-gray-100 text-nuanu-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">
                      {columnCandidates.length}
                    </span>
                  </div>

                  {/* Droppable Area */}
                  <Droppable droppableId={stage.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 overflow-y-auto p-3 space-y-3 transition-colors ${
                          snapshot.isDraggingOver ? "bg-emerald-50/50" : ""
                        }`}
                      >
                        {columnCandidates.map((candidate, index) => (
                          <Draggable key={candidate.id} draggableId={candidate.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`kanban-card bg-white p-4 rounded-xl border ${
                                  snapshot.isDragging ? "border-nuanu-emerald shadow-lg ring-1 ring-nuanu-emerald/50" : "border-nuanu-gray-200"
                                }`}
                                style={{
                                  ...provided.draggableProps.style,
                                }}
                              >
                                <div className="flex justify-between items-start mb-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-nuanu-emerald to-nuanu-teal text-white flex items-center justify-center text-xs font-bold">
                                      {candidate.name.charAt(0)}
                                    </div>
                                    <div>
                                      <h4 className="font-semibold text-sm text-nuanu-navy line-clamp-1">{candidate.name}</h4>
                                      <p className="text-[11px] text-nuanu-gray-400">{candidate.position}</p>
                                    </div>
                                  </div>
                                  <button className="text-nuanu-gray-400 hover:text-nuanu-navy">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </button>
                                </div>

                                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-nuanu-gray-100">
                                  <div className="flex items-center gap-1.5 bg-teal-50 text-teal-700 px-2 py-1 rounded border border-teal-100 text-xs font-semibold">
                                    <Brain className="w-3.5 h-3.5" />
                                    {candidate.score}%
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {candidate.tags.slice(0, 2).map(tag => (
                                      <span key={tag} className="text-[10px] bg-nuanu-gray-100 text-nuanu-gray-600 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                        {tag.replace("_", " ")}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        
                        {columnCandidates.length === 0 && !snapshot.isDraggingOver && (
                          <div className="h-24 flex items-center justify-center border-2 border-dashed border-nuanu-gray-300 rounded-xl mt-2">
                            <span className="text-sm text-nuanu-gray-400">Drop candidate here</span>
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </div>
    </div>
  );
}
