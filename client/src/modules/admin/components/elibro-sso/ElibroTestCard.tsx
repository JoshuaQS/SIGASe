import { motion, type Variants } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Terminal, User, Link2, Zap } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";


const ElibroTestCard = () => {

    const [testUser, setTestUser] = useState('');
    const [testNext, setTestNext] = useState('');

    const fade: Variants = {
        hidden: { opacity: 0, y: 12 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.5,
                ease: "easeOut"
            }
        }
    };

    return (
        <div>
            <Card className="border-border shadow-sm">
                <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-primary" />
                        Prueba controlada
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">Simula una solicitud SSO para verificar el flujo sin afectar usuarios reales.</p>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="test-user" className="text-sm font-medium flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-muted-foreground" /> Usuario de prueba
                            </Label>
                            <Input id="test-user" value={testUser} onChange={e => setTestUser(e.target.value)} placeholder="usuario@utez.edu.mx" className="text-sm font-mono" />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="test-next" className="text-sm font-medium flex items-center gap-1.5">
                                <Link2 className="w-3.5 h-3.5 text-muted-foreground" /> next
                                <Badge variant="outlined" className="text-[9px] h-4 px-1.5 font-normal">opcional</Badge>
                            </Label>
                            <Input id="test-next" value={testNext} onChange={e => setTestNext(e.target.value)} placeholder="https://…" className="text-sm font-mono" />
                        </div>
                    </div>

                    <div className="bg-muted/40 border border-border rounded-lg p-3 font-mono text-xs text-muted-foreground space-y-1">
                        <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70 mb-2">Preview de solicitud</p>
                        <p><span className="text-primary/80">POST</span></p>
                        <p><span className="text-primary/80">Authorization:</span> Token ••••••••••••</p>
                        <p><span className="text-primary/80">Body:</span> {`{ secret: ••••, channel_id: "$", user: "${testUser || '<usuario>'}" }`}</p>
                        {testNext && <p><span className="text-primary/80">Query:</span> ?next={testNext}</p>}
                    </div>

                    <div className="flex justify-end">
                        <Button variant="outline" size="sm" className="gap-2"
                            onClick={() => toast.info('Prueba SSO', { description: 'Modo mock – sin backend real conectado.' })}>
                            <Zap className="w-3.5 h-3.5" /> Ejecutar prueba
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export default ElibroTestCard;