import { Server as SocketIOServer, Socket } from "socket.io";
import { prisma } from "../index";

export function setupTelemetrySocket(io: SocketIOServer) {
  io.on("connection", (socket: Socket) => {
    console.log(`[WS] client connected: ${socket.id}`);

    socket.on("telemetry:reading", async (payload: any) => {
      try {
        const reading = await prisma.telemetryReading.create({
          data: {
            rentContractId: payload.rentContractId || null,
            clientId: payload.clientId || null,
            deviceId: payload.deviceId || null,
            inverterSerialNumber: payload.inverterSerialNumber || null,
            measurementPeriod: payload.measurementPeriod || "instant",
            energyProduced: payload.energyProduced || null,
            uptime: payload.uptime || null,
            dataSource: payload.dataSource || "ws",
            verificationStatus: "Unverified",
          },
        });

        io.emit("telemetry:update", reading);
        socket.emit("telemetry:ack", { id: reading.id });
      } catch (err: any) {
        socket.emit("telemetry:error", { message: err.message });
      }
    });

    socket.on("telemetry:subscribe", (deviceId: string) => {
      socket.join(`device:${deviceId}`);
    });

    socket.on("telemetry:unsubscribe", (deviceId: string) => {
      socket.leave(`device:${deviceId}`);
    });

    socket.on("disconnect", () => {
      console.log(`[WS] client disconnected: ${socket.id}`);
    });
  });
}
