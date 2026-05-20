import { z } from 'zod';

export const MediaStreamKindSchema = z.enum(['audio', 'video']);
export const MediaSourceSchema = z.enum(['microphone', 'camera', 'screen']);
export const MediaTransportDirectionSchema = z.enum(['send', 'recv']);
export const MediaJsonObjectSchema = z.record(z.string(), z.unknown());

export const MediaProducerSummarySchema = z.object({
  chatId: z.string(),
  userId: z.string(),
  producerId: z.string(),
  kind: MediaStreamKindSchema,
  source: MediaSourceSchema
});

export const MediaParticipantSummarySchema = z.object({
  userId: z.string(),
  displayName: z.string(),
  producers: z.array(MediaProducerSummarySchema)
});

export const ClientMediaJoinEventSchema = z.object({
  type: z.literal('media.join'),
  chatId: z.string()
});

export const ClientMediaLeaveEventSchema = z.object({
  type: z.literal('media.leave'),
  chatId: z.string()
});

export const ClientMediaCreateTransportEventSchema = z.object({
  type: z.literal('media.createTransport'),
  chatId: z.string(),
  direction: MediaTransportDirectionSchema
});

export const ClientMediaConnectTransportEventSchema = z.object({
  type: z.literal('media.connectTransport'),
  chatId: z.string(),
  transportId: z.string(),
  dtlsParameters: MediaJsonObjectSchema
});

export const ClientMediaProduceEventSchema = z.object({
  type: z.literal('media.produce'),
  chatId: z.string(),
  transportId: z.string(),
  kind: MediaStreamKindSchema,
  source: MediaSourceSchema,
  rtpParameters: MediaJsonObjectSchema
});

export const ClientMediaConsumeEventSchema = z.object({
  type: z.literal('media.consume'),
  chatId: z.string(),
  transportId: z.string(),
  producerId: z.string(),
  rtpCapabilities: MediaJsonObjectSchema
});

export const ClientMediaResumeConsumerEventSchema = z.object({
  type: z.literal('media.resumeConsumer'),
  chatId: z.string(),
  consumerId: z.string()
});

export const ClientMediaCloseProducerEventSchema = z.object({
  type: z.literal('media.closeProducer'),
  chatId: z.string(),
  producerId: z.string()
});

export const ServerMediaJoinedEventSchema = z.object({
  type: z.literal('media.joined'),
  payload: z.object({
    chatId: z.string(),
    routerRtpCapabilities: MediaJsonObjectSchema,
    participants: z.array(MediaParticipantSummarySchema),
    producers: z.array(MediaProducerSummarySchema)
  })
});

export const ServerMediaTransportCreatedEventSchema = z.object({
  type: z.literal('media.transportCreated'),
  payload: z.object({
    chatId: z.string(),
    transportId: z.string(),
    direction: MediaTransportDirectionSchema,
    iceParameters: MediaJsonObjectSchema,
    iceCandidates: z.array(MediaJsonObjectSchema),
    dtlsParameters: MediaJsonObjectSchema
  })
});

export const ServerMediaTransportConnectedEventSchema = z.object({
  type: z.literal('media.transportConnected'),
  payload: z.object({
    chatId: z.string(),
    transportId: z.string()
  })
});

export const ServerMediaProducedEventSchema = z.object({
  type: z.literal('media.produced'),
  payload: MediaProducerSummarySchema
});

export const ServerMediaProducerAddedEventSchema = z.object({
  type: z.literal('media.producerAdded'),
  payload: MediaProducerSummarySchema
});

export const ServerMediaProducerClosedEventSchema = z.object({
  type: z.literal('media.producerClosed'),
  payload: z.object({
    chatId: z.string(),
    userId: z.string(),
    producerId: z.string()
  })
});

export const ServerMediaConsumerReadyEventSchema = z.object({
  type: z.literal('media.consumerReady'),
  payload: z.object({
    chatId: z.string(),
    consumerId: z.string(),
    producerId: z.string(),
    userId: z.string(),
    kind: MediaStreamKindSchema,
    source: MediaSourceSchema,
    rtpParameters: MediaJsonObjectSchema,
    producerPaused: z.boolean()
  })
});

export const ServerMediaConsumerResumedEventSchema = z.object({
  type: z.literal('media.consumerResumed'),
  payload: z.object({
    chatId: z.string(),
    consumerId: z.string()
  })
});

export const ServerMediaParticipantLeftEventSchema = z.object({
  type: z.literal('media.participantLeft'),
  payload: z.object({
    chatId: z.string(),
    userId: z.string()
  })
});

export const ServerMediaErrorEventSchema = z.object({
  type: z.literal('media.error'),
  payload: z.object({
    code: z.string(),
    message: z.string(),
    requestType: z.string().optional()
  })
});

export type MediaStreamKind = z.infer<typeof MediaStreamKindSchema>;
export type MediaSource = z.infer<typeof MediaSourceSchema>;
export type MediaTransportDirection = z.infer<typeof MediaTransportDirectionSchema>;
export type MediaProducerSummary = z.infer<typeof MediaProducerSummarySchema>;
export type MediaParticipantSummary = z.infer<typeof MediaParticipantSummarySchema>;
export type ClientMediaJoinEvent = z.infer<typeof ClientMediaJoinEventSchema>;
export type ClientMediaLeaveEvent = z.infer<typeof ClientMediaLeaveEventSchema>;
export type ClientMediaCreateTransportEvent = z.infer<typeof ClientMediaCreateTransportEventSchema>;
export type ClientMediaConnectTransportEvent = z.infer<typeof ClientMediaConnectTransportEventSchema>;
export type ClientMediaProduceEvent = z.infer<typeof ClientMediaProduceEventSchema>;
export type ClientMediaConsumeEvent = z.infer<typeof ClientMediaConsumeEventSchema>;
export type ClientMediaResumeConsumerEvent = z.infer<typeof ClientMediaResumeConsumerEventSchema>;
export type ClientMediaCloseProducerEvent = z.infer<typeof ClientMediaCloseProducerEventSchema>;
export type ServerMediaJoinedEvent = z.infer<typeof ServerMediaJoinedEventSchema>;
export type ServerMediaTransportCreatedEvent = z.infer<typeof ServerMediaTransportCreatedEventSchema>;
export type ServerMediaTransportConnectedEvent = z.infer<typeof ServerMediaTransportConnectedEventSchema>;
export type ServerMediaProducedEvent = z.infer<typeof ServerMediaProducedEventSchema>;
export type ServerMediaProducerAddedEvent = z.infer<typeof ServerMediaProducerAddedEventSchema>;
export type ServerMediaProducerClosedEvent = z.infer<typeof ServerMediaProducerClosedEventSchema>;
export type ServerMediaConsumerReadyEvent = z.infer<typeof ServerMediaConsumerReadyEventSchema>;
export type ServerMediaConsumerResumedEvent = z.infer<typeof ServerMediaConsumerResumedEventSchema>;
export type ServerMediaParticipantLeftEvent = z.infer<typeof ServerMediaParticipantLeftEventSchema>;
export type ServerMediaErrorEvent = z.infer<typeof ServerMediaErrorEventSchema>;
