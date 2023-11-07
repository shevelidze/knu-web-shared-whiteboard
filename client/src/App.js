import { useRef, useState, useEffect } from "react";
import {
  Box,
  Button,
  Card,
  CardBody,
  CardFooter,
  ChakraProvider,
  CircularProgress,
  Flex,
  HStack,
  Input,
  Stack,
} from "@chakra-ui/react";
import { io } from "socket.io-client";
import { SliderPicker } from "react-color";

const API_URL = "http://localhost:8000";
const SOCKET_URL = "http://localhost:5000";

function getCursorPositionInElement(event) {
  const clientRect = event.target.getBoundingClientRect();

  const x = event.clientX - clientRect.left;
  const y = event.clientY - clientRect.top;

  return { x, y };
}

function App() {
  const [hasFiledUsername, setHasFiledUsername] = useState(false);
  const [username, setUsername] = useState("");
  const [initialBoardDataIsLoaded, setInitialBoardDataIsLoaded] =
    useState(false);
  const [boardData, setBoardData] = useState(null);
  const [color, setColor] = useState("#000000");

  const canvasElementRef = useRef();
  const pencilImageRef = useRef();
  const clearButtonRef = useRef();
  const colorRef = useRef(color);

  const handleUsernameChange = (event) => setUsername(event.target.value);

  const refreshBoard = () => {
    return fetch(API_URL).then(
      (response) =>
        response.json().then((data) => {
          setBoardData(data);
          setInitialBoardDataIsLoaded(true);
        }),
      () => {}
    );
  };

  useEffect(() => {
    colorRef.current = color;
  }, [color]);

  useEffect(() => {
    if (hasFiledUsername) {
      refreshBoard();
    }
  }, [hasFiledUsername]);

  useEffect(() => {
    if (!initialBoardDataIsLoaded) {
      return;
    }

    const canvasElement = canvasElementRef.current;
    const clearButtonElement = clearButtonRef.current;
    const socketIO = io(SOCKET_URL);

    const updateBoardData = ({ lines, pencils }) => {
      setBoardData((boardData) => {
        const filteredLines = boardData.lines.filter(
          (oldLine) => !lines.find((newLine) => newLine.id === oldLine.id)
        );
        return { lines: [...filteredLines, ...lines], pencils };
      });
    };

    const clearBoard = () => {
      console.log("clear");
      setBoardData((boardData) => {
        return { lines: [], pencils: boardData.pencils };
      });
    };

    socketIO.on("update", updateBoardData);
    socketIO.on("clear", clearBoard);

    const handleMoveEvent = (event) => {
      socketIO.emit("move", {
        position: getCursorPositionInElement(event),
        username,
      });
    };

    const handleDownEvent = (event) => {
      socketIO.emit("down", {
        position: getCursorPositionInElement(event),
        color: colorRef.current,
      });
    };

    const handleUpEvent = () => {
      socketIO.emit("up");
    };

    const handleClear = () => {
      socketIO.emit("clear");
    };

    canvasElement.addEventListener("mousemove", handleMoveEvent);
    canvasElement.addEventListener("mouseenter", handleMoveEvent);
    canvasElement.addEventListener("mousedown", handleDownEvent);
    canvasElement.addEventListener("mouseup", handleUpEvent);
    canvasElement.addEventListener("mouseleave", handleUpEvent);
    clearButtonElement.addEventListener("click", handleClear);

    return () => {
      canvasElement.removeEventListener("mousemove", handleMoveEvent);
      canvasElement.removeEventListener("mouseenter", handleMoveEvent);
      canvasElement.removeEventListener("mousedown", handleDownEvent);
      canvasElement.removeEventListener("mouseup", handleUpEvent);
      canvasElement.removeEventListener("mouseleave", handleUpEvent);
      clearButtonElement.removeEventListener("click", handleClear);
    };
  }, [initialBoardDataIsLoaded, username]);

  useEffect(() => {
    if (!boardData) {
      return;
    }

    const canvas = canvasElementRef.current;
    const drawingContext = canvasElementRef.current.getContext("2d");

    drawingContext.clearRect(0, 0, canvas.width, canvas.height);

    for (const line of boardData.lines) {
      drawingContext.strokeStyle = line.color;

      let lastPoint = line.points[0];

      for (const point of line.points) {
        drawingContext.beginPath();
        drawingContext.lineWidth = 5;
        drawingContext.moveTo(lastPoint.x, lastPoint.y);
        drawingContext.lineTo(point.x, point.y);
        drawingContext.stroke();

        lastPoint = point;
      }
    }

    for (const pencil of Object.values(boardData.pencils)) {
      const pencilWidth = pencilImageRef.current.naturalWidth / 10;
      const pencilHeight = pencilImageRef.current.naturalHeight / 10;

      drawingContext.drawImage(
        pencilImageRef.current,
        pencil.position.x,
        pencil.position.y - pencilHeight,
        pencilWidth,
        pencilHeight
      );

      drawingContext.font = "24px serif";
      drawingContext.fillText(
        pencil.username,
        pencil.position.x + 30,
        pencil.position.y
      );
    }

    console.log(boardData);
  }, [boardData]);

  return (
    <ChakraProvider>
      <Flex h="100vh" justifyContent="center" alignItems="center" bg="gray.100">
        {hasFiledUsername ? (
          initialBoardDataIsLoaded ? (
            <Stack>
              <Card>
                <CardBody>
                  <canvas
                    width={800}
                    height={600}
                    ref={canvasElementRef}
                    style={{ cursor: "none" }}
                  />
                </CardBody>
                <CardFooter>
                  <HStack>
                    <Box w="lg">
                      <SliderPicker
                        color={color}
                        onChange={({ hex }) => setColor(hex)}
                      />
                    </Box>
                    <Button ref={clearButtonRef}>Clear</Button>
                  </HStack>
                </CardFooter>
              </Card>
            </Stack>
          ) : (
            <CircularProgress isIndeterminate />
          )
        ) : (
          <Card>
            <CardBody>
              <HStack>
                <Input
                  placeholder="Enter username"
                  value={username}
                  onChange={handleUsernameChange}
                />
                <Button
                  onClick={() => setHasFiledUsername(true)}
                  isDisabled={username.length === 0}
                >
                  Submit
                </Button>
              </HStack>
            </CardBody>
          </Card>
        )}
      </Flex>
      <Box
        as="img"
        src="/pencil.svg"
        alt=""
        display="none"
        ref={pencilImageRef}
      />
    </ChakraProvider>
  );
}

export default App;
