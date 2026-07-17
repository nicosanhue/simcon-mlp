import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Edit2, Trash2, Building2, Layers, Cpu } from "lucide-react";
import { useProfile } from "@/contexts/ProfileContext";
import { ReadOnlyLock } from "@/components/profile/ReadOnlyLock";

interface Area {
  id: string;
  name: string;
  description: string | null;
}

interface System {
  id: string;
  name: string;
  description: string | null;
  area_id: string;
  area_name?: string;
}

interface Equipment {
  id: string;
  tag: string;
  name: string;
  description: string | null;
  criticality: 'Alta' | 'Media' | 'Baja';
  system_id: string;
  system_name?: string;
  area_name?: string;
}

export default function Assets() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [systems, setSystems] = useState<System[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("equipment");
  const { toast } = useToast();

  // Dialog states
  const [isAreaDialogOpen, setIsAreaDialogOpen] = useState(false);
  const [isSystemDialogOpen, setIsSystemDialogOpen] = useState(false);
  const [isEquipmentDialogOpen, setIsEquipmentDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Area | System | Equipment | null>(null);

  // Form states
  const [areaForm, setAreaForm] = useState({ name: "", description: "" });
  const [systemForm, setSystemForm] = useState({ name: "", description: "", area_id: "" });
  const [equipmentForm, setEquipmentForm] = useState({ 
    tag: "", name: "", description: "", criticality: "Media" as 'Alta' | 'Media' | 'Baja', system_id: "" 
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [areasRes, systemsRes, equipmentRes] = await Promise.all([
        supabase.from('areas').select('*').order('name'),
        supabase.from('systems').select('*, areas(name)').order('name'),
        supabase.from('equipment').select('*, systems(name, areas(name))').order('tag'),
      ]);

      if (areasRes.error) throw areasRes.error;
      if (systemsRes.error) throw systemsRes.error;
      if (equipmentRes.error) throw equipmentRes.error;

      setAreas(areasRes.data || []);
      setSystems(systemsRes.data?.map(s => ({
        ...s,
        area_name: s.areas?.name
      })) || []);
      setEquipment(equipmentRes.data?.map(e => ({
        ...e,
        system_name: e.systems?.name,
        area_name: e.systems?.areas?.name
      })) || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter functions
  const filteredAreas = areas.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSystems = systems.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.area_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredEquipment = equipment.filter(e => 
    e.tag.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.system_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // CRUD operations for Areas
  const handleSaveArea = async () => {
    try {
      if (editingItem) {
        const { error } = await supabase
          .from('areas')
          .update({ name: areaForm.name, description: areaForm.description || null })
          .eq('id', editingItem.id);
        if (error) throw error;
        toast({ title: "Área actualizada" });
      } else {
        const { error } = await supabase
          .from('areas')
          .insert({ name: areaForm.name, description: areaForm.description || null });
        if (error) throw error;
        toast({ title: "Área creada" });
      }
      setIsAreaDialogOpen(false);
      setEditingItem(null);
      setAreaForm({ name: "", description: "" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteArea = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar esta área?")) return;
    try {
      const { error } = await supabase.from('areas').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Área eliminada" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // CRUD operations for Systems
  const handleSaveSystem = async () => {
    try {
      if (editingItem) {
        const { error } = await supabase
          .from('systems')
          .update({ 
            name: systemForm.name, 
            description: systemForm.description || null,
            area_id: systemForm.area_id 
          })
          .eq('id', editingItem.id);
        if (error) throw error;
        toast({ title: "Sistema actualizado" });
      } else {
        const { error } = await supabase
          .from('systems')
          .insert({ 
            name: systemForm.name, 
            description: systemForm.description || null,
            area_id: systemForm.area_id 
          });
        if (error) throw error;
        toast({ title: "Sistema creado" });
      }
      setIsSystemDialogOpen(false);
      setEditingItem(null);
      setSystemForm({ name: "", description: "", area_id: "" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteSystem = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar este sistema?")) return;
    try {
      const { error } = await supabase.from('systems').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Sistema eliminado" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // CRUD operations for Equipment
  const handleSaveEquipment = async () => {
    try {
      if (editingItem) {
        const { error } = await supabase
          .from('equipment')
          .update({ 
            tag: equipmentForm.tag,
            name: equipmentForm.name, 
            description: equipmentForm.description || null,
            criticality: equipmentForm.criticality,
            system_id: equipmentForm.system_id 
          })
          .eq('id', editingItem.id);
        if (error) throw error;
        toast({ title: "Equipo actualizado" });
      } else {
        const { error } = await supabase
          .from('equipment')
          .insert({ 
            tag: equipmentForm.tag,
            name: equipmentForm.name, 
            description: equipmentForm.description || null,
            criticality: equipmentForm.criticality,
            system_id: equipmentForm.system_id 
          });
        if (error) throw error;
        toast({ title: "Equipo creado" });
      }
      setIsEquipmentDialogOpen(false);
      setEditingItem(null);
      setEquipmentForm({ tag: "", name: "", description: "", criticality: "Media", system_id: "" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteEquipment = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar este equipo?")) return;
    try {
      const { error } = await supabase.from('equipment').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Equipo eliminado" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const criticalityColors = {
    Alta: "bg-red-500/20 text-red-400 border-red-500/30",
    Media: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    Baja: "bg-green-500/20 text-green-400 border-green-500/30",
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Activos</h1>
            <p className="text-muted-foreground mt-1">
              Gestione áreas, sistemas y equipos
            </p>
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar activos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="equipment" className="gap-2">
              <Cpu className="h-4 w-4" />
              Equipos ({equipment.length})
            </TabsTrigger>
            <TabsTrigger value="systems" className="gap-2">
              <Layers className="h-4 w-4" />
              Sistemas ({systems.length})
            </TabsTrigger>
            <TabsTrigger value="areas" className="gap-2">
              <Building2 className="h-4 w-4" />
              Áreas ({areas.length})
            </TabsTrigger>
          </TabsList>

          {/* Equipment Tab */}
          <TabsContent value="equipment">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Equipos</CardTitle>
                <Dialog open={isEquipmentDialogOpen} onOpenChange={(open) => {
                  setIsEquipmentDialogOpen(open);
                  if (!open) {
                    setEditingItem(null);
                    setEquipmentForm({ tag: "", name: "", description: "", criticality: "Media", system_id: "" });
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Nuevo Equipo
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingItem ? "Editar Equipo" : "Nuevo Equipo"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Tag *</Label>
                        <Input value={equipmentForm.tag} onChange={(e) => setEquipmentForm({...equipmentForm, tag: e.target.value})} />
                      </div>
                      <div>
                        <Label>Nombre *</Label>
                        <Input value={equipmentForm.name} onChange={(e) => setEquipmentForm({...equipmentForm, name: e.target.value})} />
                      </div>
                      <div>
                        <Label>Sistema *</Label>
                        <Select value={equipmentForm.system_id} onValueChange={(v) => setEquipmentForm({...equipmentForm, system_id: v})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar sistema" />
                          </SelectTrigger>
                          <SelectContent>
                            {systems.map(s => (
                              <SelectItem key={s.id} value={s.id}>{s.area_name} → {s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Criticidad</Label>
                        <Select value={equipmentForm.criticality} onValueChange={(v: 'Alta' | 'Media' | 'Baja') => setEquipmentForm({...equipmentForm, criticality: v})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Alta">Alta</SelectItem>
                            <SelectItem value="Media">Media</SelectItem>
                            <SelectItem value="Baja">Baja</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Descripción</Label>
                        <Textarea value={equipmentForm.description} onChange={(e) => setEquipmentForm({...equipmentForm, description: e.target.value})} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsEquipmentDialogOpen(false)}>Cancelar</Button>
                      <Button onClick={handleSaveEquipment} disabled={!equipmentForm.tag || !equipmentForm.name || !equipmentForm.system_id}>
                        {editingItem ? "Guardar" : "Crear"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tag</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Sistema</TableHead>
                        <TableHead>Área</TableHead>
                        <TableHead>Criticidad</TableHead>
                        <TableHead className="w-24">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEquipment.map(eq => (
                        <TableRow key={eq.id}>
                          <TableCell className="font-mono">{eq.tag}</TableCell>
                          <TableCell>{eq.name}</TableCell>
                          <TableCell>{eq.system_name}</TableCell>
                          <TableCell>{eq.area_name}</TableCell>
                          <TableCell>
                            <Badge className={`${criticalityColors[eq.criticality]} border`}>{eq.criticality}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => {
                                setEditingItem(eq);
                                setEquipmentForm({
                                  tag: eq.tag,
                                  name: eq.name,
                                  description: eq.description || "",
                                  criticality: eq.criticality,
                                  system_id: eq.system_id
                                });
                                setIsEquipmentDialogOpen(true);
                              }}>
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteEquipment(eq.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Systems Tab */}
          <TabsContent value="systems">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Sistemas</CardTitle>
                <Dialog open={isSystemDialogOpen} onOpenChange={(open) => {
                  setIsSystemDialogOpen(open);
                  if (!open) {
                    setEditingItem(null);
                    setSystemForm({ name: "", description: "", area_id: "" });
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Nuevo Sistema
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingItem ? "Editar Sistema" : "Nuevo Sistema"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Nombre *</Label>
                        <Input value={systemForm.name} onChange={(e) => setSystemForm({...systemForm, name: e.target.value})} />
                      </div>
                      <div>
                        <Label>Área *</Label>
                        <Select value={systemForm.area_id} onValueChange={(v) => setSystemForm({...systemForm, area_id: v})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar área" />
                          </SelectTrigger>
                          <SelectContent>
                            {areas.map(a => (
                              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Descripción</Label>
                        <Textarea value={systemForm.description} onChange={(e) => setSystemForm({...systemForm, description: e.target.value})} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsSystemDialogOpen(false)}>Cancelar</Button>
                      <Button onClick={handleSaveSystem} disabled={!systemForm.name || !systemForm.area_id}>
                        {editingItem ? "Guardar" : "Crear"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Área</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead className="w-24">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSystems.map(s => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell>{s.area_name}</TableCell>
                          <TableCell className="text-muted-foreground">{s.description || "-"}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => {
                                setEditingItem(s);
                                setSystemForm({
                                  name: s.name,
                                  description: s.description || "",
                                  area_id: s.area_id
                                });
                                setIsSystemDialogOpen(true);
                              }}>
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteSystem(s.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Areas Tab */}
          <TabsContent value="areas">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Áreas</CardTitle>
                <Dialog open={isAreaDialogOpen} onOpenChange={(open) => {
                  setIsAreaDialogOpen(open);
                  if (!open) {
                    setEditingItem(null);
                    setAreaForm({ name: "", description: "" });
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Nueva Área
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingItem ? "Editar Área" : "Nueva Área"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Nombre *</Label>
                        <Input value={areaForm.name} onChange={(e) => setAreaForm({...areaForm, name: e.target.value})} />
                      </div>
                      <div>
                        <Label>Descripción</Label>
                        <Textarea value={areaForm.description} onChange={(e) => setAreaForm({...areaForm, description: e.target.value})} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAreaDialogOpen(false)}>Cancelar</Button>
                      <Button onClick={handleSaveArea} disabled={!areaForm.name}>
                        {editingItem ? "Guardar" : "Crear"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead className="w-24">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAreas.map(a => (
                        <TableRow key={a.id}>
                          <TableCell className="font-medium">{a.name}</TableCell>
                          <TableCell className="text-muted-foreground">{a.description || "-"}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => {
                                setEditingItem(a);
                                setAreaForm({
                                  name: a.name,
                                  description: a.description || ""
                                });
                                setIsAreaDialogOpen(true);
                              }}>
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteArea(a.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
