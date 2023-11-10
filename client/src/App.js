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
  Switch,
  Text,
} from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import { SliderPicker } from "react-color";
import { io } from "socket.io-client";
import { LongPollIO } from "./longPollIO";
import { Clock } from "./Clock";

const API_URL = "http://localhost:8000";
const SOCKET_URL = "http://localhost:5000";
const POLL_URL = "http://localhost:8000/poll";
const EMIT_URL = "http://localhost:8000/emit";

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
  const [isLongPollUsed, setIsLongPollUsed] = useState(false);

  const canvasElementRef = useRef();
  const pencilImageRef = useRef();
  const clearButtonRef = useRef();
  const colorRef = useRef(color);
  const clockRef = useRef(new Clock(40));

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
    const longPollIO = new LongPollIO(EMIT_URL, POLL_URL);

    const currentIO = isLongPollUsed ? longPollIO : socketIO;

    if (isLongPollUsed) {
      longPollIO.poll();
    }

    const updateBoardData = ({ lines, pencils }) => {
      clockRef.current.tick(() => {
        setBoardData((boardData) => {
          const filteredLines = boardData.lines.filter(
            (oldLine) => !lines.find((newLine) => newLine.id === oldLine.id)
          );
          return { lines: [...filteredLines, ...lines], pencils };
        });
      });
    };

    const clearBoard = () => {
      setBoardData((boardData) => {
        return { lines: [], pencils: boardData.pencils };
      });
    };

    currentIO.on("update", updateBoardData);
    currentIO.on("clear", clearBoard);

    const handleMoveEvent = (event) => {
      currentIO.emit("move", {
        position: getCursorPositionInElement(event),
        username,
      });
    };

    const handleDownEvent = (event) => {
      currentIO.emit("down", {
        position: getCursorPositionInElement(event),
        color: colorRef.current,
        username,
      });
    };

    const handleUpEvent = () => {
      currentIO.emit("up", { username });
    };

    const handleClear = () => {
      currentIO.emit("clear");
    };

    const handleLeaveEvent = () => {
      currentIO.emit("leave", { username });
    };

    canvasElement.addEventListener("mousemove", handleMoveEvent);
    canvasElement.addEventListener("mouseenter", handleMoveEvent);
    canvasElement.addEventListener("mousedown", handleDownEvent);
    canvasElement.addEventListener("mouseup", handleUpEvent);
    canvasElement.addEventListener("mouseleave", handleLeaveEvent);
    clearButtonElement.addEventListener("click", handleClear);

    return () => {
      currentIO.emit("leave", { username });

      canvasElement.removeEventListener("mousemove", handleMoveEvent);
      canvasElement.removeEventListener("mouseenter", handleMoveEvent);
      canvasElement.removeEventListener("mousedown", handleDownEvent);
      canvasElement.removeEventListener("mouseup", handleUpEvent);
      canvasElement.removeEventListener("mouseleave", handleUpEvent);
      clearButtonElement.removeEventListener("click", handleClear);

      longPollIO.stopPolling();
    };
  }, [initialBoardDataIsLoaded, username, isLongPollUsed]);

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
        drawingContext.lineCap = "round";
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
  }, [boardData]);

  return (
    <ChakraProvider>
      <Flex h="100vh" justifyContent="center" alignItems="center" bg="gray.100">
        {hasFiledUsername ? (
          initialBoardDataIsLoaded ? (
            <Stack>
              <Card>
                <CardBody>
                  <Flex flexDirection="column">
                    <Flex gap="1" alignItems="center">
                      <Text>Websocket</Text>
                      <Switch
                        isChecked={isLongPollUsed}
                        onChange={() => setIsLongPollUsed(!isLongPollUsed)}
                      />
                      <Text>Long poll</Text>
                    </Flex>
                    <canvas
                      width={800}
                      height={600}
                      ref={canvasElementRef}
                      style={{ cursor: "none" }}
                    />
                  </Flex>
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
