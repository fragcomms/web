import { Button } from "../../components/ui/button";

export default function ImportReplay(){
    return(
        <div className = "min-h-screen bg-slate-900 flex items-center justify-center">
            <div className = "flex gap-4">
                <Button
                    className = "bg-blue-600 hover:bg-blue-500 text-white"
                    onClick = {() => console.log("Button 1 clicked")}
                    >
                    Select Audio
                </Button>

                <Button
                    className = "bg-green-600 hover:bg-green-500 text-white"
                    onClick = {() => console.log("Button 2 clicked")}
                    >
                    Select AI Model
                </Button>

                <Button
                    className = "bg-red-600 hover:bg-red-500 text-white"
                    onClick = {() => console.log("Button 3 clicked")}
                    >
                    Select Demo File
                </Button>
            </div>
        </div>
    )
}