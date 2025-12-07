import { Button } from "../../components/ui/button";

const bigButton =
  "w-72 px-8 py-4 text-xl font-medium rounded-xl " +
  "bg-blue-600 hover:bg-blue-500 text-white shadow-lg " +
  "hover:[animation:spin_0.5s_ease-in-out]";

export default function ImportReplay(){
    return(
        <div className = "min-h-screen bg-slate-900 flex items-center justify-center">
            <div className = "flex flex-col gap-4">
                <Button
                    className = {bigButton}
                    onClick = {() => console.log("Button 1 clicked")}
                    >
                    Select Audio
                </Button>

                <Button
                    className = {bigButton}
                    onClick = {() => console.log("Button 2 clicked")}
                    >
                    Select AI Model
                </Button>

                <Button
                    className = {bigButton}
                    onClick = {() => console.log("Button 3 clicked")}
                    >
                    Select Demo File
                </Button>
            </div>
        </div>
    )
}