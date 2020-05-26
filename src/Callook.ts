export type operClass =
  | 'NOVICE'
  | 'TECHNICIAN'
  | 'TECHNICIAN PLUS'
  | 'GENERAL'
  | 'ADVANCED'
  | 'EXTRA'
  | '';

export interface CallookInvalidOrUpdating {
  status: 'INVALID' | 'UPDATING';
}

export interface CallookValid {
  status: 'VALID';
  type: 'CLUB' | 'MILITARY' | 'RACES' | 'RECREATION' | 'PERSON';
  current: {
    callsign: string;
    operClass: operClass;
  };
  previous: {
    callsign: string;
    operClass: operClass;
  };
  trustee: {
    callsign: string;
    name: string;
  };
  name: string;
  address: {
    line1: string;
    line2: string;
    attn: string;
  };
  location: {
    latitude: string;
    longitude: string;
    gridsquare: string;
  };
  otherInfo: {
    grantDate: string;
    expiryDate: string;
    lastActionDate: string;
    frn: string;
    ulsUrl: string;
  };
}

export type CallookLookup = CallookInvalidOrUpdating | CallookValid;

export default async function callook(call: string): Promise<CallookLookup> {
  const response = await fetch('https://callook.info/' + call + '/json');
  return (await response.json()) as CallookLookup;
}
